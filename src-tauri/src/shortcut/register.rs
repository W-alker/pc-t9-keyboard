//! 全局快捷键插件。
//!
//! 这里只把插件挂上；具体快捷键（默认 Alt+Space）由前端
//! `hooks/useGlobalShortcut.ts` 注册，回调内 invoke `toggle_panel`。
//! 这样即便面板已隐藏，webview 仍在运行，依旧能收到按键回调。

use tauri::{plugin::TauriPlugin, Wry};

pub fn plugin() -> TauriPlugin<Wry> {
    tauri_plugin_global_shortcut::Builder::new().build()
}
