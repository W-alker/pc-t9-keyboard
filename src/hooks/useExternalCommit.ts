/**
 * 监听 Rust 端 CGEventTap 发来的 'external-commit' 事件。
 *
 * 物理键盘的 Space / Enter / Escape 走不到我们的 NSPanel（panel 不取焦），
 * 这些键被目标 app 的 IME 直接消费。Rust 那边的 tap 把它们旁听到了，
 * 给我们 emit 一个事件——前端就把本地缓冲对齐到空，避免下次 diff 把
 * IME 已经落下的真实文字误退。
 */

import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "../utils/tauri";
import { useInputStore } from "../stores/inputStore";

const EVENT_NAME = "external-commit";

export function useExternalCommit() {
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;

    void listen<number>(EVENT_NAME, () => {
      useInputStore.getState().externalCommit();
    }).then((u) => {
      if (disposed) u();
      else unlisten = u;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
