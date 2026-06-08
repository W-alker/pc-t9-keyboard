/**
 * 前端 → Rust 的 IPC 封装。
 *
 * 所有调用都经过 safeInvoke：在非 Tauri 环境（如 `pnpm dev` 直接开浏览器调样式）
 * 下不会抛错，而是打印日志，方便纯前端开发。
 */

import { invoke } from "@tauri-apps/api/core";
import {
  LogicalSize,
  PhysicalPosition,
  currentMonitor,
  getCurrentWindow,
} from "@tauri-apps/api/window";

export type SpecialKey =
  | "Backspace"
  | "Enter"
  | "Space"
  | "Tab"
  | "Shift"
  | "Escape";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function safeInvoke<T = void>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T | undefined> {
  if (!isTauri()) {
    // 浏览器开发态：仅记录，不实际模拟输入。
    // eslint-disable-next-line no-console
    console.info(`[dev:no-tauri] invoke("${cmd}")`, args ?? {});
    return undefined;
  }
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`invoke("${cmd}") failed:`, err);
    return undefined;
  }
}

/** 窗口尺寸（逻辑像素）—— 与 tauri.conf.json 的 width/height 保持一致。 */
export const WINDOW_SIZE = {
  full: { w: 332, h: 412 },
  mini: { w: 56, h: 56 },
} as const;

/**
 * 改变窗口尺寸 + 锚定右下角（即新尺寸的右下角与旧右下角对齐）。
 * 缩小：window 看上去往右下角收；放大：往左上角扩。
 * 越界时会夹到所在显示器内。
 */
async function resizeAnchorBottomRight(
  newW: number,
  newH: number
): Promise<void> {
  if (!isTauri()) {
    // eslint-disable-next-line no-console
    console.info(`[dev:no-tauri] resize -> ${newW}x${newH}`);
    return;
  }
  try {
    const win = getCurrentWindow();
    const [pos, size, mon] = await Promise.all([
      win.outerPosition(), // physical
      win.outerSize(), // physical
      currentMonitor(),
    ]);
    const sf = mon?.scaleFactor ?? 1;
    const targetW = Math.round(newW * sf);
    const targetH = Math.round(newH * sf);

    // 锚右下：保持 (oldX+oldW, oldY+oldH) 不变。
    let nx = pos.x + size.width - targetW;
    let ny = pos.y + size.height - targetH;

    // 夹到显示器内（避免新尺寸把窗口顶出屏幕）。
    if (mon) {
      nx = Math.max(
        mon.position.x,
        Math.min(nx, mon.position.x + mon.size.width - targetW)
      );
      ny = Math.max(
        mon.position.y,
        Math.min(ny, mon.position.y + mon.size.height - targetH)
      );
    }

    // 先 setSize 再 setPosition：缩小时 size 先变会让右下角往左上收，
    // 紧接着 setPosition 把它推回原右下角；视觉上接近"收向右下"。
    await win.setSize(new LogicalSize(newW, newH));
    await win.setPosition(new PhysicalPosition(nx, ny));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("resize failed:", err);
  }
}

export const native = {
  /** 把拼音字母串（如 "ni'hao"）模拟键入到当前激活窗口，交给系统 IME。 */
  typeText: (text: string) => safeInvoke("type_text", { text }),
  /** 发送单个功能键到当前激活窗口。 */
  typeKey: (key: SpecialKey) => safeInvoke("type_key", { key }),
  /** 切换悬浮面板显隐。 */
  togglePanel: () => safeInvoke("toggle_panel"),
  showPanel: () => safeInvoke("show_panel"),
  hidePanel: () => safeInvoke("hide_panel"),
  /** 切到 mini 球（56x56）或还原成完整面板（332x412），右下角锚定。 */
  setWindowMode: (mode: "full" | "mini") =>
    resizeAnchorBottomRight(WINDOW_SIZE[mode].w, WINDOW_SIZE[mode].h),
};
