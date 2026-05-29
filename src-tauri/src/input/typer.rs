//! 模拟键盘输入。
//!
//! 关键点：要让**系统输入法（IME）接管**拼音 → 汉字，发送的必须是
//! 「真实按键事件」。enigo 在 Windows 上默认用 Unicode 注入（KEYEVENTF_UNICODE），
//! 那会**绕过 IME**直接落字母。因此：
//!
//! - Windows 上的拼音字母：用 `SendInput` + 扫描码发送真实按键，IME 才会拦截转换。
//! - 非 Windows（仅用于在 Mac/Linux 上调 UI）：退回 enigo 的文本输入。
//! - 退格 / 回车 / 空格 / Shift 等功能键：各平台统一用 enigo（本就是真实按键，
//!   不存在绕过 IME 的问题）。

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
    if text.is_empty() {
        return;
    }
    #[cfg(target_os = "windows")]
    {
        windows_impl::type_text(&text);
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
            let _ = enigo.text(&text);
        }
    }
}

/// 发送单个功能键到当前激活窗口（各平台统一走 enigo）。
#[tauri::command]
pub fn type_key(key: SpecialKey) {
    let Ok(mut enigo) = Enigo::new(&Settings::default()) else {
        return;
    };
    let k = match key {
        SpecialKey::Backspace => Key::Backspace,
        SpecialKey::Enter => Key::Return,
        SpecialKey::Space => Key::Space,
        SpecialKey::Tab => Key::Tab,
        SpecialKey::Shift => Key::Shift,
        SpecialKey::Escape => Key::Escape,
    };
    let _ = enigo.key(k, Direction::Click);
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
