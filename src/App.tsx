import { KeyboardLayout } from "./layouts/KeyboardLayout";
import { useGlobalShortcut } from "./hooks/useGlobalShortcut";
import { useAutoHide } from "./hooks/useAutoHide";
import { useEdgeSnap } from "./hooks/useEdgeSnap";

export function App() {
  // 全局快捷键唤起（Alt+Space）。
  useGlobalShortcut();
  // ESC 隐藏；失焦隐藏因无激活窗口默认关闭。
  useAutoHide({ hideOnBlur: false });
  // 拖拽后自动吸边 + 贴边自动隐藏。
  useEdgeSnap();

  return <KeyboardLayout />;
}
