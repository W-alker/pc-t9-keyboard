/**
 * 数字串 → 拼音候选 切分器（核心消歧逻辑）。
 *
 * 单击模式下，每个九键只产生一个数字，数字串本身有多种字母解读
 * （如 64426 可读成 nihao / nigao / ...）。本模块用一张合法拼音音节表
 * 做动态规划，枚举出所有「能被完整切分成合法音节」的解读，并按
 * 「音节数最少 + 常用度」排序。这里**不做汉字选择**——那交给系统输入法。
 */

import { syllableToDigits } from "./t9";
import { PINYIN_SYLLABLES, COMMON_SYLLABLES } from "./syllables";

export interface PinyinCandidate {
  /** 切分出的音节，如 ["ni","hao"]。 */
  syllables: string[];
  /** 展示用，空格分隔："ni hao"。 */
  display: string;
  /** 发送给系统 IME 的串，用 ' 分隔以锁定切分："ni'hao"。 */
  raw: string;
  /** 排序分，越大越靠前。 */
  score: number;
}

/** 数字模式串 -> 可能的音节列表。例如 "64" -> ["ni"], "426" -> ["gan","gao","han","hao"]。 */
const DIGITS_TO_SYLLABLES: ReadonlyMap<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const s of PINYIN_SYLLABLES) {
    const d = syllableToDigits(s);
    if (!d) continue;
    const arr = m.get(d);
    if (arr) arr.push(s);
    else m.set(d, [s]);
  }
  return m;
})();

const MAX_SYLLABLE_DIGITS = (() => {
  let max = 0;
  for (const key of DIGITS_TO_SYLLABLES.keys()) max = Math.max(max, key.length);
  return max;
})();

/** 候选条数上限。 */
const MAX_RESULTS = 12;
/** 中间结果安全上限，防止病态长输入导致组合爆炸。 */
const MAX_INTERMEDIATE = 600;
/** 超过此长度不再尝试整串切分。 */
const MAX_INPUT_DIGITS = 18;

/** 枚举所有能完整覆盖数字串的音节序列。 */
function enumerate(digits: string): string[][] {
  const memo = new Map<number, string[][]>();

  const go = (i: number): string[][] => {
    if (i === digits.length) return [[]];
    const cached = memo.get(i);
    if (cached) return cached;

    const res: string[][] = [];
    const maxLen = Math.min(MAX_SYLLABLE_DIGITS, digits.length - i);
    for (let len = 1; len <= maxLen; len++) {
      const chunk = digits.slice(i, i + len);
      const sylls = DIGITS_TO_SYLLABLES.get(chunk);
      if (!sylls) continue;
      const rest = go(i + len);
      if (rest.length === 0) continue;
      for (const syl of sylls) {
        for (const tail of rest) {
          if (res.length >= MAX_INTERMEDIATE) break;
          res.push([syl, ...tail]);
        }
        if (res.length >= MAX_INTERMEDIATE) break;
      }
      if (res.length >= MAX_INTERMEDIATE) break;
    }
    memo.set(i, res);
    return res;
  };

  return go(0);
}

function scoreOf(syllables: string[]): number {
  // 音节越少越好（更接近用户想要的词），常用音节加分。
  let score = 100 - syllables.length * 12;
  for (const s of syllables) if (COMMON_SYLLABLES.has(s)) score += 4;
  return score;
}

/**
 * 把数字串切分为排序后的拼音候选。
 * - 仅接受 2–9（0/1 不承载字母，由上层单独处理）。
 * - 无合法切分时返回空数组（通常发生在「音节还没打完」的中间态）。
 */
export function segment(digits: string): PinyinCandidate[] {
  if (!digits || digits.length > MAX_INPUT_DIGITS) return [];
  if (!/^[2-9]+$/.test(digits)) return [];

  const arrays = enumerate(digits);
  const seen = new Set<string>();
  const candidates: PinyinCandidate[] = [];

  for (const syllables of arrays) {
    const raw = syllables.join("'");
    if (seen.has(raw)) continue;
    seen.add(raw);
    candidates.push({
      syllables,
      display: syllables.join(" "),
      raw,
      score: scoreOf(syllables),
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.syllables.length - b.syllables.length ||
      a.display.localeCompare(b.display)
  );

  return candidates.slice(0, MAX_RESULTS);
}

/** 把候选展开成不带分隔符的字母串，用于 UI 预览（如 "nihao"）。 */
export function joinedLetters(candidate: PinyinCandidate | undefined): string {
  return candidate ? candidate.syllables.join("") : "";
}
