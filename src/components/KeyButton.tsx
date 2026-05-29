import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

type Variant = "default" | "accent" | "ghost";

interface KeyButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  "aria-label"?: string;
}

const VARIANT_CLASS: Record<Variant, string> = {
  default: "key-face text-ink",
  accent: "key-accent text-white",
  ghost: "glass-soft text-ink hover:bg-white/10",
};

/**
 * 通用按键：弹簧按压 / hover 抬升动画。
 * 用 onMouseDown.preventDefault 阻止按钮夺取 DOM 焦点，配合无激活窗口，
 * 确保点击不打断目标输入框。
 */
export function KeyButton({
  onPress,
  children,
  variant = "default",
  className,
  "aria-label": ariaLabel,
}: KeyButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      whileTap={{ scale: 0.93 }}
      whileHover={{ y: -1.5 }}
      transition={{ type: "spring", stiffness: 620, damping: 28 }}
      className={cn(
        "grid place-items-center rounded-[var(--radius-key)] outline-none",
        "transition-colors duration-150",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
}
