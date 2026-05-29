import clsx, { type ClassValue } from "clsx";

/** Tailwind-friendly className 合并工具。 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
