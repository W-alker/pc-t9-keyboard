/**
 * 面板 UI / 吸边状态。
 *
 * 窗口的真正显隐由 Rust 控制（全局快捷键 / 失焦 / ESC），
 * 这里只维护与吸边、贴边自动隐藏（peek）、拖拽相关的视觉状态，
 * 用来驱动 Framer Motion 的位移动画。
 */

import { create } from "zustand";

export type SnapEdge = "left" | "right" | null;

interface UIState {
  /** 吸附到了哪条屏幕边（null = 自由悬浮）。 */
  snappedEdge: SnapEdge;
  /** 是否已贴边收起（只露一条缝）。 */
  collapsed: boolean;
  /** 是否正在拖拽（拖拽时禁用收起）。 */
  dragging: boolean;

  setSnappedEdge: (edge: SnapEdge) => void;
  setCollapsed: (collapsed: boolean) => void;
  setDragging: (dragging: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  snappedEdge: null,
  collapsed: false,
  dragging: false,

  setSnappedEdge: (snappedEdge) =>
    set((s) => ({ snappedEdge, collapsed: snappedEdge ? s.collapsed : false })),
  setCollapsed: (collapsed) => set({ collapsed }),
  setDragging: (dragging) => set({ dragging }),
}));
