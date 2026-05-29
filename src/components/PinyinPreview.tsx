import { motion } from "framer-motion";
import { useInputStore } from "../stores/inputStore";

/** 数字 → 拼音 实时预览，带闪烁光标。 */
export function PinyinPreview() {
  const digits = useInputStore((s) => s.digits);
  const mode = useInputStore((s) => s.mode);
  const currentPinyin = useInputStore((s) => s.currentPinyin());

  const show = mode === "zh" && digits.length > 0;

  return (
    <div className="flex h-8 items-center gap-2 px-1">
      {show ? (
        <>
          <span className="font-mono text-[13px] tracking-wider text-ink-dim">
            {digits}
          </span>
          <span className="text-ink-faint">→</span>
          <span className="relative text-[15px] font-medium tracking-wide text-accent-soft">
            {currentPinyin}
            <motion.span
              className="ml-0.5 inline-block h-[14px] w-[2px] -mb-[1px] rounded-full bg-accent-soft align-middle"
              animate={{ opacity: [1, 0.15, 1] }}
              transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </>
      ) : (
        <span className="text-[12px] text-ink-faint">
          {mode === "en" ? "EN · 直接输出字符" : "等待输入"}
        </span>
      )}
    </div>
  );
}
