//! 全局键盘事件旁听（macOS）。
//!
//! 物理键盘的 Space/Enter/Escape **不经过我们的 NSPanel**——直接进目标 app
//! 被 IME 吃掉了。但 IME 一旦确认/取消，合成区就被清，而我们前端的 `lastSent`
//! 还停留在旧值上 → 下次再点数字算 diff 会把已经落下的真实汉字也退掉。
//!
//! 解决：在 `kCGHIDEventTap` 装一个 **ListenOnly** 的 CGEventTap（不抢事件、
//! 只旁观），看到 Space(49)/Enter(36)/Escape(53) 就 emit Tauri 事件，前端清状态。
//!
//! 注意：我们自己合成的 Space/Enter 也会被这个 tap 收到，但那时前端 `lastSent`
//! 已被 `commit()` 同步清空，外发通知就是 no-op，安全。

use core_foundation::runloop::CFRunLoop;
use core_graphics::event::{
    CGEventField, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement,
    CGEventType, CallbackResult,
};
use tauri::{AppHandle, Emitter, Runtime};

/// `kCGKeyboardEventKeycode`（CoreGraphics 整型字段索引）。
const KCG_KEYBOARD_EVENT_KEYCODE: CGEventField = 9;

const VK_RETURN: i64 = 0x24;
const VK_SPACE: i64 = 0x31;
const VK_ESCAPE: i64 = 0x35;

/// 前端要监听这个事件名。Payload 是 i64 keycode（可选用，不必看）。
pub const EVENT_NAME: &str = "external-commit";

/// 启动 tap 监听线程。必须在 setup 中调用一次。
pub fn install<R: Runtime>(app: AppHandle<R>) {
    std::thread::spawn(move || {
        let result = CGEventTap::with_enabled(
            CGEventTapLocation::HID,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::ListenOnly,
            vec![CGEventType::KeyDown],
            move |_proxy, etype, event| {
                if matches!(etype, CGEventType::KeyDown) {
                    let code = event.get_integer_value_field(KCG_KEYBOARD_EVENT_KEYCODE);
                    if code == VK_SPACE || code == VK_RETURN || code == VK_ESCAPE {
                        if let Err(err) = app.emit(EVENT_NAME, code) {
                            eprintln!("[event_tap] emit failed: {err:?}");
                        }
                    }
                }
                CallbackResult::Keep
            },
            || CFRunLoop::run_current(),
        );
        if let Err(err) = result {
            eprintln!("[event_tap] install failed: {err:?}");
        }
    });
}
