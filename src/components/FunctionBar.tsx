import { useInputStore } from "../stores/inputStore";
import { KeyButton } from "./KeyButton";

function BackspaceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 5.5h9.5A1.5 1.5 0 0 1 20 7v10a1.5 1.5 0 0 1-1.5 1.5H9L3.2 12.6a1 1 0 0 1 0-1.2L9 5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m11.5 10 4 4m0-4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EnterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 5v6a3 3 0 0 1-3 3H5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9 10-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 底部功能区：中英切换 / 空格 / 删除 / 回车。 */
export function FunctionBar() {
  const mode = useInputStore((s) => s.mode);
  const toggleMode = useInputStore((s) => s.toggleMode);
  const onSpace = useInputStore((s) => s.onSpace);
  const backspace = useInputStore((s) => s.backspace);
  const onEnter = useInputStore((s) => s.onEnter);

  return (
    <div className="grid grid-cols-[1.1fr_2fr_1fr_1fr] gap-2.5">
      <KeyButton variant="ghost" onPress={toggleMode} className="h-12" aria-label="中英切换">
        <span className="text-[13px] font-medium text-ink">
          {mode === "zh" ? "中 / 英" : "EN / 中"}
        </span>
      </KeyButton>

      <KeyButton variant="ghost" onPress={onSpace} className="h-12" aria-label="空格">
        <span className="text-[12px] tracking-[0.35em] text-ink-dim">空格</span>
      </KeyButton>

      <KeyButton variant="ghost" onPress={backspace} className="h-12" aria-label="删除">
        <span className="text-ink-dim">
          <BackspaceIcon />
        </span>
      </KeyButton>

      <KeyButton variant="accent" onPress={onEnter} className="h-12" aria-label="回车">
        <EnterIcon />
      </KeyButton>
    </div>
  );
}
