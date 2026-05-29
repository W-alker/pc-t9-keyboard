mod input;
mod shortcut;
mod window;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 全局快捷键插件（实际快捷键由前端 useGlobalShortcut 注册）。
        .plugin(shortcut::plugin())
        .setup(|app| {
            if let Some(main) = app.get_webview_window("main") {
                window::manager::setup_window(&main);
            }
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
