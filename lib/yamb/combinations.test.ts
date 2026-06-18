import { describe, expect, it } from "vitest";
import {
  calculateAutoScore,
  isFul,
  isJamb,
  isKenta,
  isPoker,
  isTriling,
} from "./combinations";
import type { Dice } from "./types";

describe("combinations", () => {
  it("detects Kenta 1-5 and 2-6", () => {
    expect(isKenta([1, 2, 3, 4, 5])).toBe(true);
    expect(isKenta([2, 3, 4, 5, 6])).toBe(true);
    expect(isKenta([6, 5, 4, 3, 2])).toBe(true);
    expect(isKenta([1, 2, 3, 4, 6])).toBe(false);
    expect(isKenta([3, 3, 3, 3, 3])).toBe(false);
  });

  it("detects Triling", () => {
    expect(isTriling([3, 3, 3, 1, 2])).toBe(true);
    expect(isTriling([1, 2, 3, 4, 5])).toBe(false);
  });

  it("detects Ful (3+2)", () => {
    expect(isFul([3, 3, 3, 2, 2])).toBe(true);
    expect(isFul([3, 3, 2, 2, 2])).toBe(true);
    expect(isFul([3, 3, 3, 3, 2])).toBe(false);
  });

  it("detects Poker", () => {
    expect(isPoker([4, 4, 4, 4, 1])).toBe(true);
    expect(isPoker([3, 3, 3, 1, 2])).toBe(false);
  });

  it("detects Jamb", () => {
    expect(isJamb([5, 5, 5, 5, 5])).toBe(true);
    expect(isJamb([5, 5, 5, 5, 1])).toBe(false);
  });

  it("scores rows 1-6 as sum of matching dice", () => {
    const dice: Dice = [1, 1, 3, 5, 6];
    expect(calculateAutoScore("ROW_1", dice)).toBe(2);
    expect(calculateAutoScore("ROW_2", dice)).toBe(0);
    expect(calculateAutoScore("ROW_3", [1, 3, 3, 3, 5])).toBe(9);
  });

  it("scores Maximum and Minimum as sum of all dice", () => {
    const dice: Dice = [2, 4, 4, 5, 6];
    expect(calculateAutoScore("MAXIMUM", dice)).toBe(21);
    expect(calculateAutoScore("MINIMUM", dice)).toBe(21);
  });

  it("scores Kenta as 66 or 0", () => {
    expect(calculateAutoScore("KENTA", [1, 2, 3, 4, 5])).toBe(66);
    expect(calculateAutoScore("KENTA", [1, 1, 1, 1, 1])).toBe(0);
  });

  it("scores combination rows as sum or 0", () => {
    const triling: Dice = [4, 4, 4, 2, 1];
    expect(calculateAutoScore("TRILING", triling)).toBe(15);
    expect(calculateAutoScore("TRILING", [1, 2, 3, 4, 5])).toBe(0);

    const ful: Dice = [3, 3, 3, 2, 2];
    expect(calculateAutoScore("FUL", ful)).toBe(13);

    const poker: Dice = [6, 6, 6, 6, 1];
    expect(calculateAutoScore("POKER", poker)).toBe(25);

    const jamb: Dice = [2, 2, 2, 2, 2];
    expect(calculateAutoScore("JAMB", jamb)).toBe(10);
  });
});
