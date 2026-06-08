import { useDrag } from "../hooks/useDrag";
import { useInputStore } from "../stores/inputStore";
import { useUIStore } from "../stores/uiStore";

/** 顶部条：拖拽手柄 + 标题 + 模式标识 + 隐藏按钮。 */
export function TitleBar() {
  const onPointerDown = useDrag();
  const mode = useInputStore((s) => s.mode);
  const setMini = useUIStore((s) => s.setMini);

  return (
    <div className="flex items-center justify-between">
      <div
        onPointerDown={onPointerDown}
        className="flex flex-1 cursor-grab items-center gap-2 py-0.5 active:cursor-grabbing"
      >
        <span className="grid grid-cols-3 gap-[2.5px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <i
              key={i}
              className="block h-[3px] w-[3px] rounded-full bg-accent-soft/85"
            />
          ))}
        </span>
        <span className="text-[12px] font-medium tracking-wide text-ink-dim">
          T9 悬浮键盘
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-ink-dim">
          {mode === "zh" ? "中" : "EN"}
        </span>
        <button
          type="button"
          aria-label="收起为迷你球"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMini(true)}
          className="grid h-6 w-6 place-items-center rounded-md text-ink-dim transition-colors hover:bg-white/10 hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6h7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
