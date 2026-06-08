import { AnimatePresence, motion } from "framer-motion";
import { useInputStore } from "../stores/inputStore";
import { cn } from "../utils/cn";

/**
 * 拼音候选栏（注意：这里是「拼音」候选，不是汉字）。
 * 点击某条 = 把该拼音发给系统 IME，由 IME 弹出汉字候选。
 */
export function CandidateBar() {
  const candidates = useInputStore((s) => s.candidates);
  const selectedIndex = useInputStore((s) => s.selectedIndex);
  const digits = useInputStore((s) => s.digits);
  const mode = useInputStore((s) => s.mode);
  const selectCandidate = useInputStore((s) => s.selectCandidate);

  const empty = candidates.length === 0;

  return (
    // 容器固定两行高（~60px），候选自动换行；超出可滚轮上下滚动。
    <div className="h-[60px] overflow-y-auto overflow-x-hidden px-0.5">
      {empty ? (
        <div className="flex h-full items-center">
          <span className="px-2 text-[12px] text-ink-faint">
            {mode === "en"
              ? "英文 / 数字直输模式"
              : digits
                ? "无匹配拼音，继续输入…"
                : "九键拼音 · 单击数字开始"}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap content-start gap-1.5 py-0.5">
          <AnimatePresence initial={false} mode="popLayout">
            {candidates.map((c, i) => (
              <motion.button
                key={c.raw}
                layout
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                onMouseDown={(e) => e.preventDefault()}
                // 只切换拼音预览 → IME 自动 diff 重打；不提交（要提交按空格）。
                onClick={() => selectCandidate(i)}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-1 text-[13px] leading-tight transition-colors",
                  i === selectedIndex
                    ? "key-accent text-white"
                    : "glass-soft text-ink hover:bg-white/10"
                )}
              >
                {c.display}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
