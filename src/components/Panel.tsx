import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

interface PanelProps {
  children: ReactNode;
  className?: string;
}

/** 毛玻璃面板容器，带渐入动画。 */
export function Panel({ children, className }: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className={cn(
        "glass flex flex-col gap-2.5 rounded-[var(--radius-panel)] p-3",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
