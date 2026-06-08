import { Panel } from "../components/Panel";
import { TitleBar } from "../components/TitleBar";
import { PinyinPreview } from "../components/PinyinPreview";
import { CandidateBar } from "../components/CandidateBar";
import { Keypad } from "../components/Keypad";
import { FunctionBar } from "../components/FunctionBar";
import { MiniLauncher } from "../components/MiniLauncher";
import { useUIStore } from "../stores/uiStore";

/** 整体布局：标题 / 预览 / 候选 / 九宫格 / 功能区。Mini 态切到 MiniLauncher。 */
export function KeyboardLayout() {
  const isMini = useUIStore((s) => s.isMini);

  if (isMini) return <MiniLauncher />;

  return (
    // 让 panel 直接铺满窗口 —— 否则 vibrancy 会在内边距区域露出灰白 halo。
    <div className="h-full w-full">
      <Panel className="h-full w-full">
        <TitleBar />
        <PinyinPreview />
        <CandidateBar />
        <Keypad />
        <FunctionBar />
      </Panel>
    </div>
  );
}
