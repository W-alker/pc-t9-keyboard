/**
 * 输入状态（单一数据源）+ 行为。
 *
 * 关键设计：**实时增量同步到系统 IME**。
 *   - 维护 `lastSent`，记录目前已经送进 IME 合成缓冲的拼音字母串。
 *   - 每次按数字 / 切候选 / 退格 都调用 `_syncIME()`：
 *     1) 找出 `lastSent` 与新拼音的最长公共前缀；
 *     2) 多出的尾巴用退格清掉；
 *     3) 新增的尾巴当真实按键打过去；
 *   - 这样 IME 的浮动候选窗会跟随我们的候选实时更新，而不是直到空格才出现。
 *
 *  Note: 所有发到 Rust 的 IPC 都在一个串行 promise 队列上排队，避免点击太快时
 *  退格和补字乱序。
 */

import { create } from "zustand";
import { segment, type PinyinCandidate } from "../engine/segmenter";
import { native } from "../utils/tauri";

export type InputMode = "zh" | "en";

interface InputState {
  /** 已按下的数字串（仅 2–9 进入 zh 模式缓冲）。 */
  digits: string;
  /** 当前候选列表。 */
  candidates: PinyinCandidate[];
  /** 选中候选下标。 */
  selectedIndex: number;
  /** zh = 拼音模式；en = 直接数字/英文直输。 */
  mode: InputMode;
  /** 已经送进系统 IME 合成缓冲的拼音串（含 ' 分隔），用于增量 diff。 */
  lastSent: string;

  // ---- 派生 ----
  currentPinyin: () => string;
  selectedCandidate: () => PinyinCandidate | undefined;

  // ---- 行为（InputEngine） ----
  appendNumber: (num: string) => void;
  backspace: () => void;
  clear: () => void;
  selectCandidate: (index: number) => void;
  commitCandidate: (index: number) => void;
  commit: () => void;

  // ---- 功能键 ----
  toggleMode: () => void;
  onSpace: () => void;
  onEnter: () => void;

  /**
   * 外部（物理键盘）按下 Space / Enter / Escape 触发。
   * 这时 IME 已经在目标 app 里自己处理完了；我们只需把本地缓冲对齐到空，
   * 不能再发任何按键（否则会重复操作）。
   */
  externalCommit: () => void;
}

function recompute(digits: string): Pick<InputState, "candidates" | "selectedIndex"> {
  return { candidates: segment(digits), selectedIndex: 0 };
}

/**
 * 把异步任务串成一条 promise 链——保证 IPC 按入队顺序到达 Rust，
 * 否则连点会出现 "退格还没送过去就来了新字母" 之类的乱序。
 */
const enqueue: (fn: () => Promise<void>) => Promise<void> = (() => {
  let chain: Promise<void> = Promise.resolve();
  return (fn) => {
    chain = chain.then(fn, fn).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[inputStore] sync IME err:", err);
    });
    return chain;
  };
})();

export const useInputStore = create<InputState>((set, get) => {
  /**
   * 把当前选中候选的拼音 diff 推到 IME。
   * `target`：希望 IME 合成缓冲变成什么；空串 = 清空。
   * 行为：先送退格抹掉 lastSent 不一致的尾巴，再补打 target 新增的尾巴。
   */
  const syncIME = async (): Promise<void> => {
    const { mode, digits, candidates, selectedIndex, lastSent } = get();
    if (mode !== "zh") return;

    let target = "";
    if (digits.length > 0) {
      if (candidates.length === 0) {
        // 中间态：当前数字串还不能完整切分成音节。保持 IME 现状，
        // 用户多按一位就会重新有候选并继续同步。
        return;
      }
      target = candidates[selectedIndex]!.raw;
    }
    if (target === lastSent) return;

    // 最长公共前缀
    let prefix = 0;
    const min = Math.min(target.length, lastSent.length);
    while (prefix < min && target.charCodeAt(prefix) === lastSent.charCodeAt(prefix)) {
      prefix += 1;
    }

    const deletes = lastSent.length - prefix;
    const toType = target.slice(prefix);

    for (let i = 0; i < deletes; i++) {
      await native.typeKey("Backspace");
    }
    if (toType.length > 0) {
      await native.typeText(toType);
    }

    set({ lastSent: target });
  };

  /** clear 内部使用：把 IME 合成缓冲彻底清掉，并重置本地状态。 */
  const resetAll = async (): Promise<void> => {
    const { lastSent } = get();
    if (lastSent.length > 0) {
      // Escape 通常会取消 IME 合成；保险起见再退一波。
      await native.typeKey("Escape");
    }
    set({ digits: "", candidates: [], selectedIndex: 0, lastSent: "" });
  };

  return {
    digits: "",
    candidates: [],
    selectedIndex: 0,
    mode: "zh",
    lastSent: "",

    currentPinyin: () => {
      const { candidates, selectedIndex, digits } = get();
      const c = candidates[selectedIndex];
      return c ? c.syllables.join("") : digits;
    },
    selectedCandidate: () => {
      const { candidates, selectedIndex } = get();
      return candidates[selectedIndex];
    },

    appendNumber: (num) => {
      const { mode, digits } = get();
      if (mode === "en") {
        // EN 模式：直接把这个数字键入目标窗口。
        void native.typeText(num);
        return;
      }
      if (!/^[2-9]$/.test(num)) return;
      const next = digits + num;
      set({ digits: next, ...recompute(next) });
      void enqueue(syncIME);
    },

    backspace: () => {
      const { mode, digits, lastSent } = get();
      if (mode === "en") {
        void native.typeKey("Backspace");
        return;
      }
      if (digits.length === 0) {
        // 缓冲已空：如果 IME 还有合成残留就清掉它，否则就把退格送给目标。
        if (lastSent.length > 0) {
          void enqueue(resetAll);
        } else {
          void native.typeKey("Backspace");
        }
        return;
      }
      const next = digits.slice(0, -1);
      set({ digits: next, ...recompute(next) });
      void enqueue(syncIME);
    },

    clear: () => {
      void enqueue(resetAll);
    },

    selectCandidate: (index) => {
      const { candidates } = get();
      if (index < 0 || index >= candidates.length) return;
      set({ selectedIndex: index });
      void enqueue(syncIME);
    },

    /**
     * commit = 让系统 IME 把合成缓冲里的拼音「定型」成汉字。
     * 立刻清本地 UI（用户按下就感到空），随后异步发空格让 IME 确认。
     */
    commit: () => {
      const { mode, lastSent } = get();
      if (mode === "en") return;
      // 同步清状态 —— UI 即刻刷新，且后续 syncIME 看到的 lastSent="" 与 IME 实际
      // 状态（即将被 Space 清空）一致。
      set({ digits: "", candidates: [], selectedIndex: 0, lastSent: "" });
      if (lastSent.length === 0) return;
      void enqueue(async () => {
        await native.typeKey("Space");
      });
    },

    commitCandidate: (index) => {
      get().selectCandidate(index);
      get().commit();
    },

    toggleMode: () => {
      const next: InputMode = get().mode === "zh" ? "en" : "zh";
      // 先把 IME 合成清掉再切，避免残留。
      void enqueue(async () => {
        await resetAll();
        set({ mode: next });
        // 顺手发个 Shift，多数 IME 用它切中/英（macOS 上效果因 IME 而异，无伤大雅）。
        await native.typeKey("Shift");
      });
    },

    /**
     * 空格 = 「确定输入」。三种情况：
     *  a) zh + 有合成 → 走 commit，让 IME 用首位汉字确认；
     *  b) zh + 无合成但本地数字非空（中间态卡住）→ 清本地缓冲 + 给目标发空格；
     *  c) 其他 → 直接给目标发空格。
     * 共同点：**永远清空本地输入状态**。
     */
    onSpace: () => {
      const { mode, lastSent, digits } = get();
      if (mode !== "zh") {
        void native.typeKey("Space");
        return;
      }
      if (lastSent.length > 0) {
        get().commit();
        return;
      }
      if (digits.length > 0) {
        set({ digits: "", candidates: [], selectedIndex: 0 });
      }
      void native.typeKey("Space");
    },

    /**
     * 回车 = 「确定输入并换行」。和 onSpace 同样的三种情况：
     *  a) zh + 有合成 → 先空格让 IME 确认，再发回车；本地立即清；
     *  b) zh + 无合成但有缓冲 → 清缓冲 + 发回车；
     *  c) 其他 → 直接发回车。
     */
    onEnter: () => {
      const { mode, lastSent, digits } = get();
      if (mode !== "zh") {
        void native.typeKey("Enter");
        return;
      }
      if (lastSent.length > 0) {
        set({ digits: "", candidates: [], selectedIndex: 0, lastSent: "" });
        void enqueue(async () => {
          await native.typeKey("Space");
          await native.typeKey("Enter");
        });
        return;
      }
      if (digits.length > 0) {
        set({ digits: "", candidates: [], selectedIndex: 0 });
      }
      void native.typeKey("Enter");
    },

    /**
     * 物理键盘按下 Space/Enter/Escape 时，CGEventTap 通知我们 IME
     * 已经在外部消费/取消了合成区——把本地状态对齐到空即可，
     * **不能**再发任何按键，否则会和已经发生的 IME 操作叠加。
     */
    externalCommit: () => {
      const { lastSent, digits } = get();
      if (lastSent.length === 0 && digits.length === 0) return;
      set({ digits: "", candidates: [], selectedIndex: 0, lastSent: "" });
    },
  };
});
