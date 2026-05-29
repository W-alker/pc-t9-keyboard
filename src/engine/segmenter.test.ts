import { describe, it, expect } from "vitest";
import { segment, joinedLetters } from "./segmenter";
import { syllableToDigits, lettersOf } from "./t9";

describe("T9 mapping", () => {
  it("converts syllables to digit sequences", () => {
    expect(syllableToDigits("ni")).toBe("64");
    expect(syllableToDigits("hao")).toBe("426");
    expect(syllableToDigits("nihao")).toBe("64426");
    expect(syllableToDigits("zhuang")).toBe("948264");
  });

  it("exposes the letters printed on each key", () => {
    expect(lettersOf("2")).toBe("abc");
    expect(lettersOf("7")).toBe("pqrs");
    expect(lettersOf("9")).toBe("wxyz");
    expect(lettersOf("1")).toBe("");
  });
});

describe("segment()", () => {
  it("resolves 64426 to 'ni hao' as the top candidate", () => {
    const candidates = segment("64426");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].syllables).toEqual(["ni", "hao"]);
    expect(candidates[0].raw).toBe("ni'hao"); // ' 锁定切分，发给 IME
    expect(joinedLetters(candidates[0])).toBe("nihao");
  });

  it("prefers fewer syllables (maximal munch)", () => {
    const [best] = segment("64426");
    expect(best.syllables.length).toBe(2);
  });

  it("offers a complete single syllable like 426 -> hao", () => {
    const letters = segment("426").map((c) => c.syllables.join(""));
    expect(letters).toContain("hao");
  });

  it("rejects strings with 0/1 and empty input (no pinyin letters)", () => {
    expect(segment("104")).toEqual([]);
    expect(segment("")).toEqual([]);
    expect(segment("1")).toEqual([]);
  });

  it("returns de-duplicated, bounded, descending-score candidates", () => {
    const candidates = segment("64426");
    const raws = candidates.map((c) => c.raw);
    expect(new Set(raws).size).toBe(raws.length);
    expect(candidates.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });
});
