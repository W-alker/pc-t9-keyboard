mod input;
mod shortcut;
mod window;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        // 全局快捷键插件（实际快捷键由前端 useGlobalShortcut 注册）。
        .plugin(shortcut::plugin());

    // macOS：把主窗口转为 NSPanel，实现「点击不抢焦点」。
    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    builder
        .setup(|app| {
            if let Some(main) = app.get_webview_window("main") {
                window::manager::setup_window(&main);
            }
            // macOS：旁观物理 Space/Enter/Escape，触发前端同步清空。
            #[cfg(target_os = "macos")]
            input::event_tap::install(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            input::typer::type_text,
            input::typer::type_key,
            window::manager::toggle_panel,
            window::manager::show_panel,
            window::manager::hide_panel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
