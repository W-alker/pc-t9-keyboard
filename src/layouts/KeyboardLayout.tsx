import { Panel } from "../components/Panel";
import { TitleBar } from "../components/TitleBar";
import { PinyinPreview } from "../components/PinyinPreview";
import { CandidateBar } from "../components/CandidateBar";
import { Keypad } from "../components/Keypad";
import { FunctionBar } from "../components/FunctionBar";

/** 整体布局：标题 / 预览 / 候选 / 九宫格 / 功能区。 */
export function KeyboardLayout() {
  return (
    // 外层留白 + 居中，让圆角与柔和阴影显示在透明窗口内。
    <div className="flex h-full w-full items-center justify-center p-3">
      <Panel className="w-full">
        <TitleBar />
        <PinyinPreview />
        <CandidateBar />
        <Keypad />
        <FunctionBar />
      </Panel>
    </div>
  );
}
