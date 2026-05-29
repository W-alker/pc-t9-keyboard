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
  const commitCandidate = useInputStore((s) => s.commitCandidate);

  const empty = candidates.length === 0;

  return (
    <div className="h-10 px-0.5">
      <div className="flex h-full items-center gap-1.5 overflow-x-auto">
        {empty ? (
          <span className="px-2 text-[12px] text-ink-faint">
            {mode === "en"
              ? "英文 / 数字直输模式"
              : digits
                ? "无匹配拼音，继续输入…"
                : "九键拼音 · 单击数字开始"}
          </span>
        ) : (
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
                onClick={() => commitCandidate(i)}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-1 text-[14px] transition-colors",
                  i === selectedIndex
                    ? "key-accent text-white"
                    : "glass-soft text-ink hover:bg-white/10"
                )}
              >
                {c.display}
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
