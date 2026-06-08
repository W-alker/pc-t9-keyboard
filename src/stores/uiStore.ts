/**
 * 面板 UI / 吸边状态。
 *
 * 窗口的真正显隐由 Rust 控制（全局快捷键 / 失焦 / ESC），
 * 这里只维护与吸边、贴边自动隐藏（peek）、拖拽相关的视觉状态，
 * 用来驱动 Framer Motion 的位移动画。
 */

import { create } from "zustand";
import { native } from "../utils/tauri";

export type SnapEdge = "left" | "right" | null;

interface UIState {
  /** 吸附到了哪条屏幕边（null = 自由悬浮）。 */
  snappedEdge: SnapEdge;
  /** 是否已贴边收起（只露一条缝）。 */
  collapsed: boolean;
  /** 是否正在拖拽（拖拽时禁用收起）。 */
  dragging: boolean;
  /** 是否处于 mini 球状态（窗口被缩到 56x56）。 */
  isMini: boolean;

  setSnappedEdge: (edge: SnapEdge) => void;
  setCollapsed: (collapsed: boolean) => void;
  setDragging: (dragging: boolean) => void;
  /** 切到 mini / 还原。会同步把原生窗口尺寸调整过去。 */
  setMini: (mini: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  snappedEdge: null,
  collapsed: false,
  dragging: false,
  isMini: false,

  setSnappedEdge: (snappedEdge) =>
    set((s) => ({ snappedEdge, collapsed: snappedEdge ? s.collapsed : false })),
  setCollapsed: (collapsed) => set({ collapsed }),
  setDragging: (dragging) => set({ dragging }),
  setMini: (isMini) => {
    set({ isMini });
    // 触发原生窗口 resize；IPC 异步，UI 立刻切换视图。
    void native.setWindowMode(isMini ? "mini" : "full");
  },
}));
