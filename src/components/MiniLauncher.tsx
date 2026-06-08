import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useUIStore } from "../stores/uiStore";
import { isTauri } from "../utils/tauri";

/** 超过这么多像素视为「在拖」，否则视为「点」展开。 */
const DRAG_THRESHOLD = 4;

/**
 * 折叠态：56×56 的迷你球。
 * - 点一下展开回完整面板（向左上扩）。
 * - 按住拖动可以移动整个小球。
 * 用 pointer 事件 + 移动阈值区分「点击」与「拖拽」——
 * 否则一按下就 startDragging，click 事件会被 OS 吞掉。
 */
export function MiniLauncher() {
  const setMini = useUIStore((s) => s.setMini);
  const drag = useRef<{ x: number; y: number; started: boolean } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, started: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const info = drag.current;
    if (!info || info.started) return;
    if (
      Math.abs(e.clientX - info.x) > DRAG_THRESHOLD ||
      Math.abs(e.clientY - info.y) > DRAG_THRESHOLD
    ) {
      info.started = true;
      if (isTauri()) void getCurrentWindow().startDragging();
    }
  };

  const onPointerUp = () => {
    const info = drag.current;
    drag.current = null;
    // 没移动 → 视为点击 → 展开
    if (info && !info.started) {
      setMini(false);
    }
  };

  // 指针离开按钮（比如被 OS 拖动接管后）也清状态，避免下次点击被误判
  const onPointerCancel = () => {
    drag.current = null;
  };

  return (
    <div className="h-full w-full">
      <motion.button
        type="button"
        aria-label="展开 T9 键盘"
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        className="glass grid h-full w-full cursor-grab place-items-center rounded-[var(--radius-panel)] active:cursor-grabbing"
      >
        <span className="grid grid-cols-3 gap-[4px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <i
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-accent-soft"
            />
          ))}
        </span>
      </motion.button>
    </div>
  );
}
