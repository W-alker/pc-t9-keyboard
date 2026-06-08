//! 窗口管理：毛玻璃材质、无激活窗口、显隐切换。

use tauri::WebviewWindow;

/// 初始化主窗口外观与行为（在 setup 中调用一次）。
pub fn setup_window(window: &WebviewWindow) {
    apply_effects(window);

    #[cfg(target_os = "windows")]
    apply_no_activate(window);

    #[cfg(target_os = "macos")]
    apply_nspanel(window);
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

/// macOS：把主窗口转为 NSPanel 并打开 nonactivating 样式位。
/// 这等价于 Windows 的 WS_EX_NOACTIVATE —— 点面板不夺焦点，
/// 模拟的按键才能落到目标窗口由系统 IME 处理。
///
/// 常量参考 Apple AppKit：
/// - `NSWindowStyleMaskNonactivatingPanel = 1 << 7`（0x80）
/// - `NSFloatingWindowLevel = 3`
#[cfg(target_os = "macos")]
fn apply_nspanel(window: &WebviewWindow) {
    use tauri_nspanel::WebviewWindowExt;

    const NS_WINDOW_STYLE_MASK_NONACTIVATING_PANEL: i32 = 1 << 7;
    const NS_FLOATING_WINDOW_LEVEL: i32 = 3;

    let Ok(panel) = window.to_panel() else { return };

    // ⚠ 这一步必须在 `to_panel()` 之后执行 —— `to_panel()` 才会注册 RawNSPanel 类。
    // tauri-nspanel 自带实现把 canBecomeKeyWindow 钉成 YES（给 Spotlight 这种带搜索框的
    // 面板用），我们正相反 —— 永远不能成为 key window，否则点 panel 时焦点会从
    // 目标输入框被抢到我们的 WebView，物理键盘也敲不进去。
    patch_raw_nspanel_never_key();

    panel.set_style_mask(NS_WINDOW_STYLE_MASK_NONACTIVATING_PANEL);
    panel.set_level(NS_FLOATING_WINDOW_LEVEL);
    panel.set_floating_panel(true);
    // 双保险（即便 canBecomeKey=NO 已经盖死了，这条保留语义）。
    panel.set_becomes_key_only_if_needed(true);
    // App 失活时不要自动消失（点击别的程序 panel 仍可见）。
    panel.set_hides_on_deactivate(false);
}

/// 把 tauri-nspanel 的 RawNSPanel 类的 `canBecomeKeyWindow` 改成返回 NO。
/// 直接走 objc runtime 的 `class_replaceMethod`，比 swizzle 干净。
#[cfg(target_os = "macos")]
fn patch_raw_nspanel_never_key() {
    use objc::runtime::{Class, Object, Sel, BOOL, NO};
    use objc::{sel, sel_impl};
    use std::ffi::c_void;
    use std::os::raw::c_char;

    extern "C" fn never_key(_this: &Object, _cmd: Sel) -> BOOL {
        NO
    }

    let Some(cls) = Class::get("RawNSPanel") else {
        eprintln!("[window/macos] RawNSPanel 类找不到，patch 跳过");
        return;
    };

    extern "C" {
        fn class_replaceMethod(
            cls: *const Class,
            name: Sel,
            imp: extern "C" fn(&Object, Sel) -> BOOL,
            types: *const c_char,
        ) -> *const c_void;
    }

    // Objective-C 类型编码："c@:" = BOOL (self) (cmd)。
    let types = c"c@:".as_ptr();
    // SAFETY: 我们传入的 imp 函数签名与 canBecomeKeyWindow 一致（无参 + self/cmd），
    // 返回 BOOL；types 字符串与签名匹配；cls 来自 Class::get 非空。
    let _prev = unsafe {
        class_replaceMethod(cls as *const Class, sel!(canBecomeKeyWindow), never_key, types)
    };
    eprintln!("[window/macos] 已覆写 RawNSPanel.canBecomeKeyWindow → NO");
}
