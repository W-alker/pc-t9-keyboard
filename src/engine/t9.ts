/**
 * T9 / 九宫格 字母映射。
 *
 * 这只是「键位 → 字母」的静态映射，不含任何语言智能。
 * 数字 0 / 1 不承载拼音字母（与手机九键一致）。
 */

export const T9_LAYOUT: Record<string, string> = {
  "1": "",
  "2": "abc",
  "3": "def",
  "4": "ghi",
  "5": "jkl",
  "6": "mno",
  "7": "pqrs",
  "8": "tuv",
  "9": "wxyz",
  "0": "",
};

/** 标注在按键上的副标签（拼音字母）。 */
export function lettersOf(digit: string): string {
  return T9_LAYOUT[digit] ?? "";
}

/** 字母 → 数字键。例如 'n' -> '6'。 */
export const LETTER_TO_DIGIT: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [digit, letters] of Object.entries(T9_LAYOUT)) {
    for (const ch of letters) map[ch] = digit;
  }
  return map;
})();

/**
 * 把一个拼音音节（纯小写字母，ü 以 v 表示）转换成它的数字按键序列。
 * 例如 "ni" -> "64"，"hao" -> "426"。
 * 含有非法字母时返回 null。
 */
export function syllableToDigits(syllable: string): string | null {
  let out = "";
  for (const ch of syllable) {
    const d = LETTER_TO_DIGIT[ch];
    if (!d) return null;
    out += d;
  }
  return out;
}
