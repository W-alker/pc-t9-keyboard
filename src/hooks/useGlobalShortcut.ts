/**
 * 全局快捷键唤起（默认 Alt+Space，类 PowerToys Run / Flow Launcher）。
 *
 * 用 @tauri-apps/plugin-global-shortcut 在 JS 侧注册——即使面板已隐藏，
 * webview 仍在运行，回调依旧能收到，从而切换显隐。
 */

import { useEffect } from "react";
import {
  register,
  unregister,
  isRegistered,
} from "@tauri-apps/plugin-global-shortcut";
import { isTauri, native } from "../utils/tauri";

export const TOGGLE_HOTKEY = "Alt+Space";

export function useGlobalShortcut(hotkey: string = TOGGLE_HOTKEY) {
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;

    (async () => {
      try {
        if (await isRegistered(hotkey)) await unregister(hotkey);
        if (cancelled) return;
        await register(hotkey, (event) => {
          // v2 回调带 { state: "Pressed" | "Released" }；只在按下时切换。
          if (!event || event.state !== "Released") {
            void native.togglePanel();
          }
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("注册全局快捷键失败:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (isTauri()) void unregister(hotkey).catch(() => undefined);
    };
  }, [hotkey]);
}
