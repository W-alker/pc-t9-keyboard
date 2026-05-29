//! 窗口管理：毛玻璃材质、无激活窗口、显隐切换。

use tauri::WebviewWindow;

/// 初始化主窗口外观与行为（在 setup 中调用一次）。
pub fn setup_window(window: &WebviewWindow) {
    apply_effects(window);

    #[cfg(target_os = "windows")]
    apply_no_activate(window);
}

/// 在透明 webview 背后应用原生材质：Windows = Acrylic，macOS = Vibrancy。
fn apply_effects(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::apply_acrylic;
        // 半透明深色 Acrylic（rgba）。
        let _ = apply_acrylic(window, Some((18, 18, 28, 125)));
    }

    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
        let _ = apply_vibrancy(
            window,
            NSVisualEffectMaterial::HudWindow,
            Some(NSVisualEffectState::Active),
            Some(16.0),
        );
    }

    // 其它平台不做处理（CSS 的半透明 + backdrop-filter 仍然生效）。
    let _ = window;
}

/// Windows：给窗口加 WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW，
/// 使点击面板不会抢走目标输入框的焦点，模拟输入才能落到目标程序。
#[cfg(target_os = "windows")]
fn apply_no_activate(window: &WebviewWindow) {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
    };

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let updated =
                current | (WS_EX_NOACTIVATE.0 as isize) | (WS_EX_TOOLWINDOW.0 as isize);
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, updated);
        }
    }
}

/// 切换面板显隐（全局快捷键回调最终调用它）。
#[tauri::command]
pub fn toggle_panel(window: WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        // 重新确保不抢焦点 / 置顶。
        #[cfg(target_os = "windows")]
        apply_no_activate(&window);
    }
}

#[tauri::command]
pub fn show_panel(window: WebviewWindow) {
    let _ = window.show();
    #[cfg(target_os = "windows")]
    apply_no_activate(&window);
}

#[tauri::command]
pub fn hide_panel(window: WebviewWindow) {
    let _ = window.hide();
}
