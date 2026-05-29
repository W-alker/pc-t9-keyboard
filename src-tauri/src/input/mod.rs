// `typer` is public so `generate_handler!` can resolve the command helpers
// (`input::typer::type_text`, ...). The `#[tauri::command]` macro generates
// sibling items that are NOT carried by a `pub use` re-export.
pub mod typer;
