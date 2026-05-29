/**
 * 前端 → Rust 的 IPC 封装。
 *
 * 所有调用都经过 safeInvoke：在非 Tauri 环境（如 `pnpm dev` 直接开浏览器调样式）
 * 下不会抛错，而是打印日志，方便纯前端开发。
 */

import { invoke } from "@tauri-apps/api/core";

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

export const native = {
  /** 把拼音字母串（如 "ni'hao"）模拟键入到当前激活窗口，交给系统 IME。 */
  typeText: (text: string) => safeInvoke("type_text", { text }),
  /** 发送单个功能键到当前激活窗口。 */
  typeKey: (key: SpecialKey) => safeInvoke("type_key", { key }),
  /** 切换悬浮面板显隐。 */
  togglePanel: () => safeInvoke("toggle_panel"),
  showPanel: () => safeInvoke("show_panel"),
  hidePanel: () => safeInvoke("hide_panel"),
};
