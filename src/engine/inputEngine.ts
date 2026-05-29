/**
 * 输入引擎契约。
 *
 * 真正的状态与行为放在 Zustand 的 inputStore（单一数据源），
 * 这里给出用户约定的 `InputEngine` 接口，以及一个不依赖 React 的门面
 * `getInputEngine()`，方便在非组件代码 / 测试中以接口方式驱动引擎。
 */

import { useInputStore } from "../stores/inputStore";
import type { PinyinCandidate } from "./segmenter";

export interface InputEngine {
  /** 追加一个数字键（"2".."9"，0/1 由上层另行处理）。 */
  appendNumber(num: string): void;
  /** 删除：缓冲区非空则删一位数字，否则向目标窗口发送一次退格。 */
  backspace(): void;
  /** 清空当前数字缓冲与候选。 */
  clear(): void;
  /** 当前选中候选的拼音字母（无分隔，如 "nihao"）。 */
  getCurrentPinyin(): string;
  /** 提交：把当前拼音发送给系统输入法，然后清空缓冲。 */
  commit(): void;
}

/** 引擎扩展接口，暴露候选与选择，供候选栏使用。 */
export interface T9Engine extends InputEngine {
  getDigits(): string;
  getCandidates(): PinyinCandidate[];
  getSelectedIndex(): number;
  selectCandidate(index: number): void;
}

/** 以接口形式访问全局输入引擎（底层即 inputStore）。 */
export function getInputEngine(): T9Engine {
  const s = () => useInputStore.getState();
  return {
    appendNumber: (n) => s().appendNumber(n),
    backspace: () => s().backspace(),
    clear: () => s().clear(),
    commit: () => s().commit(),
    getCurrentPinyin: () => s().currentPinyin(),
    getDigits: () => s().digits,
    getCandidates: () => s().candidates,
    getSelectedIndex: () => s().selectedIndex,
    selectCandidate: (i) => s().selectCandidate(i),
  };
}
