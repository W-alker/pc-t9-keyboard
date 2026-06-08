//! 模拟键盘输入。
//!
//! 关键点：要让**系统输入法（IME）接管**拼音 → 汉字，发送的必须是
//! 「真实按键事件」。enigo 默认会用 Unicode 注入（Windows: `KEYEVENTF_UNICODE`，
//! macOS: `CGEventKeyboardSetUnicodeString`）—— 那会**绕过 IME**直接落字母。
//!
//! - Windows 字母：`SendInput` + 扫描码，发送真实按键。
//! - macOS 字母：按 ANSI 美式布局虚拟键码用 `enigo.key(Key::Other(vk))`，
//!   走 `CGEventCreateKeyboardEvent` 真实按键路径（IME 才会拦截）。
//! - 退格 / 回车 / 空格 / Shift 等功能键：各平台统一用 enigo 的命名键，本就是
//!   真实按键，不存在绕过 IME 的问题。

// enigo 仅在 Windows / Linux 用到（macOS 全走原生 CGEvent）。
#[cfg(not(target_os = "macos"))]
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Deserialize;

#[derive(Debug, Clone, Copy, Deserialize)]
pub enum SpecialKey {
    Backspace,
    Enter,
    Space,
    Tab,
    Shift,
    Escape,
}

/// 把拼音字母串（如 "ni'hao"）模拟键入到当前激活窗口。
#[tauri::command]
pub fn type_text(text: String) {
    eprintln!("[typer] type_text({text:?})");
    if text.is_empty() {
        return;
    }
    #[cfg(target_os = "windows")]
    {
        windows_impl::type_text(&text);
    }
    #[cfg(target_os = "macos")]
    {
        macos_impl::type_text(&text);
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        match Enigo::new(&Settings::default()) {
            Ok(mut enigo) => match enigo.text(&text) {
                Ok(_) => eprintln!("[typer] enigo.text ok"),
                Err(e) => eprintln!("[typer] enigo.text err: {e:?}"),
            },
            Err(e) => eprintln!("[typer] Enigo::new err: {e:?}"),
        }
    }
}

/// 发送单个功能键到当前激活窗口。
/// macOS 也走原生 CG 事件（enigo 的 marker 同样会被 IME 过滤掉，
/// 否则 sync 时退不掉 IME 已有的合成字母）。
#[tauri::command]
pub fn type_key(key: SpecialKey) {
    eprintln!("[typer] type_key({key:?})");
    #[cfg(target_os = "macos")]
    {
        macos_impl::type_key(key);
        return;
    }
    #[cfg(not(target_os = "macos"))]
    {
        let mut enigo = match Enigo::new(&Settings::default()) {
            Ok(e) => e,
            Err(e) => {
                eprintln!("[typer] Enigo::new err: {e:?}");
                return;
            }
        };
        let k = match key {
            SpecialKey::Backspace => Key::Backspace,
            SpecialKey::Enter => Key::Return,
            SpecialKey::Space => Key::Space,
            SpecialKey::Tab => Key::Tab,
            SpecialKey::Shift => Key::Shift,
            SpecialKey::Escape => Key::Escape,
        };
        if let Err(e) = enigo.key(k, Direction::Click) {
            eprintln!("[typer] enigo.key err: {e:?}");
        }
    }
}

#[cfg(target_os = "windows")]
mod windows_impl {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        MapVirtualKeyW, SendInput, VkKeyScanW, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
        KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, KEYEVENTF_UNICODE,
        MAPVK_VK_TO_VSC, VIRTUAL_KEY,
    };

    const VK_SHIFT: u32 = 0x10;

    pub fn type_text(text: &str) {
        for ch in text.chars() {
            unsafe { send_char(ch) };
        }
    }

    unsafe fn send_scancode(scan: u16, key_up: bool) {
        let mut flags = KEYEVENTF_SCANCODE;
        if key_up {
            flags |= KEYEVENTF_KEYUP;
        }
        send(VIRTUAL_KEY(0), scan, flags);
    }

    unsafe fn send_unicode_unit(unit: u16, key_up: bool) {
        let mut flags = KEYEVENTF_UNICODE;
        if key_up {
            flags |= KEYEVENTF_KEYUP;
        }
        send(VIRTUAL_KEY(0), unit, flags);
    }

    unsafe fn send(vk: VIRTUAL_KEY, scan: u16, flags: KEYBD_EVENT_FLAGS) {
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: scan,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }

    /// 用真实按键（扫描码）发送一个字符，让 IME 能够拦截。
    /// 无法映射到键位的字符回退为 Unicode 注入。
    unsafe fn send_char(ch: char) {
        let mut buf = [0u16; 2];
        let units = ch.encode_utf16(&mut buf);
        if units.len() != 1 {
            for &u in units.iter() {
                send_unicode_unit(u, false);
                send_unicode_unit(u, true);
            }
            return;
        }
        let cu = units[0];

        let vks = VkKeyScanW(cu);
        if vks == -1 {
            send_unicode_unit(cu, false);
            send_unicode_unit(cu, true);
            return;
        }

        let vk = (vks & 0x00ff) as u32;
        let need_shift = (vks >> 8) & 0x01 != 0;
        let scan = MapVirtualKeyW(vk, MAPVK_VK_TO_VSC) as u16;
        if scan == 0 {
            send_unicode_unit(cu, false);
            send_unicode_unit(cu, true);
            return;
        }

        let shift_scan = MapVirtualKeyW(VK_SHIFT, MAPVK_VK_TO_VSC) as u16;
        if need_shift {
            send_scancode(shift_scan, false);
        }
        send_scancode(scan, false);
        send_scancode(scan, true);
        if need_shift {
            send_scancode(shift_scan, true);
        }
    }
}

#[cfg(target_os = "macos")]
mod macos_impl {
    use super::SpecialKey;
    use core_graphics::event::{CGEvent, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
    use std::thread;
    use std::time::Duration;

    // Carbon `kVK_*` 常量。
    const VK_RETURN: u16 = 0x24;
    const VK_TAB: u16 = 0x30;
    const VK_SPACE: u16 = 0x31;
    const VK_DELETE: u16 = 0x33; // 退格（macOS 上的 Backspace 叫 Delete）
    const VK_ESCAPE: u16 = 0x35;
    const VK_SHIFT: u16 = 0x38;

    fn new_source() -> Option<CGEventSource> {
        CGEventSource::new(CGEventSourceStateID::CombinedSessionState).ok()
    }

    fn post(source: &CGEventSource, code: u16) {
        if let Ok(down) = CGEvent::new_keyboard_event(source.clone(), code, true) {
            down.post(CGEventTapLocation::HID);
        }
        if let Ok(up) = CGEvent::new_keyboard_event(source.clone(), code, false) {
            up.post(CGEventTapLocation::HID);
        }
    }

    pub fn type_key(key: SpecialKey) {
        let Some(source) = new_source() else {
            eprintln!("[typer/macos] type_key: CGEventSource failed");
            return;
        };
        let code = match key {
            SpecialKey::Backspace => VK_DELETE,
            SpecialKey::Enter => VK_RETURN,
            SpecialKey::Space => VK_SPACE,
            SpecialKey::Tab => VK_TAB,
            SpecialKey::Shift => VK_SHIFT,
            SpecialKey::Escape => VK_ESCAPE,
        };
        post(&source, code);
        eprintln!("[typer/macos] type_key {key:?} (vk=0x{code:02X}) posted");
        thread::sleep(Duration::from_millis(6));
    }

    /// 查询当前进程在 macOS 是否拥有「辅助功能」(Accessibility) 信任。
    /// CGEventPost 在没有这权限时**不会报错**，事件会被系统静默丢掉——
    /// 所以遇到「日志全 ok 但目标 app 收不到」这种症状，先看这个。
    fn ax_trusted() -> bool {
        #[link(name = "ApplicationServices", kind = "framework")]
        extern "C" {
            fn AXIsProcessTrusted() -> u8;
        }
        // SAFETY: 调用 Apple 框架的简单 C 函数，无参数，无副作用。
        (unsafe { AXIsProcessTrusted() }) != 0
    }

    /// 直接用 CoreGraphics 发原始键盘事件，绕过 enigo 的 EVENT_MARKER。
    /// IME（百度/搜狗/微软拼音）只接受看起来「干净」的按键事件——enigo 会给每个
    /// 合成事件打 EVENT_SOURCE_USER_DATA 标记，被 IME 当作合成事件过滤掉。
    pub fn type_text(text: &str) {
        let trusted = ax_trusted();
        let exe = std::env::current_exe()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| "<unknown>".into());
        eprintln!("[typer/macos] AXIsProcessTrusted = {trusted}; exe = {exe}");
        if !trusted {
            eprintln!(
                "[typer/macos] ⚠ 没有辅助功能权限：事件会被系统静默丢弃。\
                 把上面那个 exe 路径加进 系统设置→隐私与安全性→辅助功能 并打勾，\
                 或对它的父 Terminal/iTerm 授权 + Cmd+Q 重开再 pnpm tauri dev。"
            );
        }

        let Some(source) = new_source() else {
            eprintln!("[typer/macos] CGEventSource::new failed");
            return;
        };
        for ch in text.chars() {
            let Some(code) = keycode(ch) else {
                eprintln!("[typer/macos] skip '{ch}' (no keycode mapping)");
                continue;
            };
            post(&source, code);
            eprintln!("[typer/macos] key '{ch}' (vk=0x{code:02X}) posted");
            // 给 IME 一点时间消化每一击。
            thread::sleep(Duration::from_millis(8));
        }
    }

    /// ANSI 美式布局虚拟键码（Carbon `kVK_ANSI_*` / `kVK_*`，参考
    /// `<HIToolbox/Events.h>`）。覆盖拼音字母 + `'` 分隔符 + 空格。
    fn keycode(ch: char) -> Option<u16> {
        Some(match ch {
            'a' => 0x00,
            'b' => 0x0B,
            'c' => 0x08,
            'd' => 0x02,
            'e' => 0x0E,
            'f' => 0x03,
            'g' => 0x05,
            'h' => 0x04,
            'i' => 0x22,
            'j' => 0x26,
            'k' => 0x28,
            'l' => 0x25,
            'm' => 0x2E,
            'n' => 0x2D,
            'o' => 0x1F,
            'p' => 0x23,
            'q' => 0x0C,
            'r' => 0x0F,
            's' => 0x01,
            't' => 0x11,
            'u' => 0x20,
            'v' => 0x09,
            'w' => 0x0D,
            'x' => 0x07,
            'y' => 0x10,
            'z' => 0x06,
            // 数字（kVK_ANSI_*） —— EN 模式需要直输数字
            '0' => 0x1D,
            '1' => 0x12,
            '2' => 0x13,
            '3' => 0x14,
            '4' => 0x15,
            '5' => 0x17,
            '6' => 0x16,
            '7' => 0x1A,
            '8' => 0x1C,
            '9' => 0x19,
            '\'' => 0x27, // kVK_ANSI_Quote
            ' ' => 0x31,  // kVK_Space
            _ => return None,
        })
    }
}
