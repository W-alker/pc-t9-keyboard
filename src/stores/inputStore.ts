/**
 * 输入状态（单一数据源）+ 行为。
 *
 * 这就是 InputEngine 的实际实现：持有数字缓冲、候选与选择，
 * 用 segmenter 把数字串消歧成拼音候选；commit 时把选中的拼音
 * 经 Rust(enigo / SendInput) 发送到当前激活窗口，由系统 IME 出汉字。
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

  // ---- 派生 ----
  /** 当前选中候选的拼音字母（无分隔，如 "nihao"）；无候选时回退为数字串。 */
  currentPinyin: () => string;
  selectedCandidate: () => PinyinCandidate | undefined;

  // ---- 行为（InputEngine） ----
  appendNumber: (num: string) => void;
  backspace: () => void;
  clear: () => void;
  selectCandidate: (index: number) => void;
  /** 选中并立即提交某个候选（点候选栏）。 */
  commitCandidate: (index: number) => void;
  commit: () => void;

  // ---- 功能键 ----
  toggleMode: () => void;
  onSpace: () => void;
  onEnter: () => void;
}

function recompute(digits: string): Pick<InputState, "candidates" | "selectedIndex"> {
  return { candidates: segment(digits), selectedIndex: 0 };
}

export const useInputStore = create<InputState>((set, get) => ({
  digits: "",
  candidates: [],
  selectedIndex: 0,
  mode: "zh",

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
      // 英文/数字直输：直接把这个数字键入目标窗口。
      void native.typeText(num);
      return;
    }
    // zh 模式：只有 2–9 承载拼音字母。
    if (!/^[2-9]$/.test(num)) return;
    const next = digits + num;
    set({ digits: next, ...recompute(next) });
  },

  backspace: () => {
    const { mode, digits } = get();
    if (mode === "en" || digits.length === 0) {
      // 缓冲为空 → 把退格发送给目标窗口。
      void native.typeKey("Backspace");
      return;
    }
    const next = digits.slice(0, -1);
    set({ digits: next, ...recompute(next) });
  },

  clear: () => set({ digits: "", candidates: [], selectedIndex: 0 }),

  selectCandidate: (index) => {
    const { candidates } = get();
    if (index < 0 || index >= candidates.length) return;
    set({ selectedIndex: index });
  },

  commit: () => {
    const { mode, candidates, selectedIndex } = get();
    if (mode === "en") return;
    const cand = candidates[selectedIndex];
    if (!cand) return;
    // 发送拼音（以 ' 锁定切分）给系统 IME，由 IME 弹出汉字候选。
    void native.typeText(cand.raw);
    get().clear();
  },

  commitCandidate: (index) => {
    get().selectCandidate(index);
    get().commit();
  },

  toggleMode: () => {
    const next: InputMode = get().mode === "zh" ? "en" : "zh";
    get().clear();
    set({ mode: next });
    // 同步切换系统输入法中/英（大多数 IME 用 Shift 切换）。
    void native.typeKey("Shift");
  },

  onSpace: () => {
    const { mode, candidates } = get();
    if (mode === "zh" && candidates.length > 0) {
      get().commit(); // 空格 = 确认当前拼音候选
    } else {
      void native.typeKey("Space");
    }
  },

  onEnter: () => {
    const { mode, digits } = get();
    if (mode === "zh" && digits.length > 0) {
      get().commit();
    } else {
      void native.typeKey("Enter");
    }
  },
}));
