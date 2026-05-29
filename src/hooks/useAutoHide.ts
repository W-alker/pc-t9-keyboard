/**
 * 自动隐藏：ESC 隐藏，可选失焦隐藏。
 *
 * 注意：本面板使用「无激活」窗口（WS_EX_NOACTIVATE）以避免抢占目标输入框焦点，
 * 因此通常拿不到稳定的 blur 事件——失焦隐藏默认关闭，仅作为可选项保留。
 */

import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri, native } from "../utils/tauri";

interface AutoHideOptions {
  hideOnBlur?: boolean;
}

export function useAutoHide({ hideOnBlur = false }: AutoHideOptions = {}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void native.hidePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    let unlisten: (() => void) | undefined;
    if (isTauri() && hideOnBlur) {
      void getCurrentWindow()
        .onFocusChanged(({ payload: focused }) => {
          if (!focused) void native.hidePanel();
        })
        .then((u) => {
          unlisten = u;
        });
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      unlisten?.();
    };
  }, [hideOnBlur]);
}
