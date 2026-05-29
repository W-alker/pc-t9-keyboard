/**
 * 拖动面板：在标题/拖拽区按下时，交给 OS 原生移动循环。
 */

import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../utils/tauri";
import { useUIStore } from "../stores/uiStore";

export function useDrag() {
  const setDragging = useUIStore((s) => s.setDragging);

  return useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return; // 仅左键拖动
      if (!isTauri()) return;
      setDragging(true);
      void getCurrentWindow().startDragging();
    },
    [setDragging]
  );
}
