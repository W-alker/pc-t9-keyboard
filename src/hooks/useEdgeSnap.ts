/**
 * 自动吸边 + 贴边自动隐藏（peek）。
 *
 * - 拖拽停下后，若窗口靠近屏幕左/右边缘，则吸附贴齐。
 * - 吸边后空闲一段时间自动滑出屏幕，只留一条缝；鼠标移入面板时滑回。
 *
 * 所有坐标均为物理像素（与 monitor / outerPosition 一致）。
 */

import { useEffect } from "react";
import {
  getCurrentWindow,
  currentMonitor,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import { isTauri } from "../utils/tauri";
import { useUIStore } from "../stores/uiStore";

const EDGE_THRESHOLD = 28; // 距边多近触发吸附
const SLIVER = 6; // 收起后露出的缝宽
const COLLAPSE_DELAY = 1600; // 吸边后多久自动收起
const MOVE_DEBOUNCE = 160; // 移动停止判定

type Edge = "left" | "right" | null;

export function useEdgeSnap() {
  const setSnappedEdge = useUIStore((s) => s.setSnappedEdge);
  const setCollapsed = useUIStore((s) => s.setCollapsed);
  const setDragging = useUIStore((s) => s.setDragging);

  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();

    let collapseTimer: number | undefined;
    let moveTimer: number | undefined;
    let edge: Edge = null;
    let collapsed = false;

    const clearCollapse = () => {
      if (collapseTimer) {
        clearTimeout(collapseTimer);
        collapseTimer = undefined;
      }
    };

    const expand = async () => {
      if (!edge || !collapsed) return;
      const mon = await currentMonitor();
      if (!mon) return;
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      const x =
        edge === "left"
          ? mon.position.x
          : mon.position.x + mon.size.width - size.width;
      await win.setPosition(new PhysicalPosition(x, pos.y));
      collapsed = false;
      setCollapsed(false);
    };

    const collapse = async () => {
      if (!edge || collapsed) return;
      const mon = await currentMonitor();
      if (!mon) return;
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      const x =
        edge === "left"
          ? mon.position.x - (size.width - SLIVER)
          : mon.position.x + mon.size.width - SLIVER;
      await win.setPosition(new PhysicalPosition(x, pos.y));
      collapsed = true;
      setCollapsed(true);
    };

    const scheduleCollapse = () => {
      clearCollapse();
      if (edge) collapseTimer = window.setTimeout(() => void collapse(), COLLAPSE_DELAY);
    };

    const evalSnap = async () => {
      if (collapsed) return;
      const mon = await currentMonitor();
      if (!mon) return;
      const pos = await win.outerPosition();
      const size = await win.outerSize();

      const leftGap = pos.x - mon.position.x;
      const rightGap =
        mon.position.x + mon.size.width - (pos.x + size.width);

      let next: Edge = null;
      if (leftGap <= EDGE_THRESHOLD) next = "left";
      else if (rightGap <= EDGE_THRESHOLD) next = "right";

      if (next) {
        const x =
          next === "left"
            ? mon.position.x
            : mon.position.x + mon.size.width - size.width;
        const y = Math.max(
          mon.position.y,
          Math.min(pos.y, mon.position.y + mon.size.height - size.height)
        );
        await win.setPosition(new PhysicalPosition(x, y));
      }

      edge = next;
      setSnappedEdge(next);
      scheduleCollapse();
    };

    const onMoved = () => {
      setDragging(false);
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = window.setTimeout(() => void evalSnap(), MOVE_DEBOUNCE);
    };

    const onPointerEnter = () => {
      clearCollapse();
      void expand();
    };
    const onPointerLeave = () => scheduleCollapse();

    const unlistenPromise = win.onMoved(onMoved);
    document.documentElement.addEventListener("mouseenter", onPointerEnter);
    document.documentElement.addEventListener("mouseleave", onPointerLeave);

    return () => {
      clearCollapse();
      if (moveTimer) clearTimeout(moveTimer);
      void unlistenPromise.then((u) => u());
      document.documentElement.removeEventListener("mouseenter", onPointerEnter);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
    };
  }, [setSnappedEdge, setCollapsed, setDragging]);
}
