// `typer` is public so `generate_handler!` can resolve the command helpers
// (`input::typer::type_text`, ...). The `#[tauri::command]` macro generates
// sibling items that are NOT carried by a `pub use` re-export.
pub mod typer;

// macOS-only: global keyboard event tap (listen-only) that lets the frontend
// resync after the IME commits/cancels via physical Space/Enter/Escape.
#[cfg(target_os = "macos")]
pub mod event_tap;
