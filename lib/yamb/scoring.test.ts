import { describe, expect, it } from "vitest";
import {
  calculateColumnTotal,
  calculateFinalScore,
  calculateRazlika,
  calculateSum1to6,
  calculateSumCombinations,
} from "./scoring";
import type { Dice, FillableRowKey, ScoreEntry } from "./types";

function entry(rowKey: FillableRowKey, score: number, dice: Dice): ScoreEntry {
  return { rowKey, score, dice };
}

describe("scoring", () => {
  it("calculates Σ(1-6) without bonus below 60", () => {
    const entries = {
      ROW_1: entry("ROW_1", 3, [1, 1, 1, 2, 3]),
      ROW_2: entry("ROW_2", 4, [2, 2, 4, 5, 6]),
      ROW_3: entry("ROW_3", 9, [3, 3, 3, 4, 5]),
      ROW_4: entry("ROW_4", 8, [4, 4, 5, 6, 1]),
      ROW_5: entry("ROW_5", 10, [5, 5, 6, 1, 2]),
      ROW_6: entry("ROW_6", 12, [6, 6, 1, 2, 3]),
    };
    const result = calculateSum1to6(entries);
    expect(result.sum).toBe(46);
    expect(result.bonus).toBe(0);
  });

  it("adds +30 bonus when Σ(1-6) >= 60", () => {
    const entries = {
      ROW_1: entry("ROW_1", 5, [1, 1, 1, 1, 1]),
      ROW_2: entry("ROW_2", 10, [2, 2, 2, 2, 2]),
      ROW_3: entry("ROW_3", 9, [3, 3, 3, 0, 0] as unknown as Dice),
      ROW_4: entry("ROW_4", 12, [4, 4, 4, 0, 0] as unknown as Dice),
      ROW_5: entry("ROW_5", 15, [5, 5, 5, 0, 0] as unknown as Dice),
      ROW_6: entry("ROW_6", 12, [6, 6, 0, 0, 0] as unknown as Dice),
    };
    // Fix dice to valid
    entries.ROW_3 = entry("ROW_3", 9, [3, 3, 3, 1, 2]);
    entries.ROW_4 = entry("ROW_4", 12, [4, 4, 4, 1, 1]);
    entries.ROW_5 = entry("ROW_5", 15, [5, 5, 5, 1, 2]);
    entries.ROW_6 = entry("ROW_6", 12, [6, 6, 1, 2, 3]);

    const result = calculateSum1to6(entries);
    expect(result.sum).toBe(63);
    expect(result.bonus).toBe(30);
  });

  it("calculates Razlika as (Max-Min) × ones in Minimum dice", () => {
    const entries = {
      MAXIMUM: entry("MAXIMUM", 28, [6, 6, 6, 5, 5]),
      MINIMUM: entry("MINIMUM", 8, [1, 1, 1, 2, 3]),
    };
    // (28-8) × 3 = 60
    expect(calculateRazlika(entries)).toBe(60);
  });

  it("returns Razlika 0 when Minimum <= 5", () => {
    const entries = {
      MAXIMUM: entry("MAXIMUM", 25, [6, 6, 5, 4, 4]),
      MINIMUM: entry("MINIMUM", 5, [1, 1, 1, 1, 1]),
    };
    expect(calculateRazlika(entries)).toBe(0);
  });

  it("returns Razlika 0 when ones count <= 1", () => {
    const entries = {
      MAXIMUM: entry("MAXIMUM", 28, [6, 6, 6, 5, 5]),
      MINIMUM: entry("MINIMUM", 10, [2, 2, 2, 2, 2]),
    };
    expect(calculateRazlika(entries)).toBe(0);
  });

  it("calculates Σ(kombinacije)", () => {
    const entries = {
      KENTA: entry("KENTA", 66, [1, 2, 3, 4, 5]),
      TRILING: entry("TRILING", 15, [4, 4, 4, 2, 1]),
      FUL: entry("FUL", 0, [1, 2, 3, 4, 5]),
      POKER: entry("POKER", 0, [1, 1, 1, 1, 2]),
      JAMB: entry("JAMB", 0, [1, 2, 3, 4, 6]),
    };
    expect(calculateSumCombinations(entries)).toBe(81);
  });

  it("calculates UKUPNO per column", () => {
    const entries = {
      ROW_1: entry("ROW_1", 10, [1, 1, 1, 1, 1]),
      ROW_2: entry("ROW_2", 10, [2, 2, 2, 2, 2]),
      ROW_3: entry("ROW_3", 9, [3, 3, 3, 1, 2]),
      ROW_4: entry("ROW_4", 8, [4, 4, 1, 2, 3]),
      ROW_5: entry("ROW_5", 10, [5, 5, 1, 2, 3]),
      ROW_6: entry("ROW_6", 12, [6, 6, 1, 2, 3]),
      MAXIMUM: entry("MAXIMUM", 28, [6, 6, 6, 5, 5]),
      MINIMUM: entry("MINIMUM", 8, [1, 1, 1, 2, 3]),
      KENTA: entry("KENTA", 66, [1, 2, 3, 4, 5]),
      TRILING: entry("TRILING", 0, [1, 2, 3, 4, 6]),
      FUL: entry("FUL", 0, [1, 2, 3, 4, 6]),
      POKER: entry("POKER", 0, [1, 2, 3, 4, 6]),
      JAMB: entry("JAMB", 0, [1, 2, 3, 4, 6]),
    };

    const totals = calculateColumnTotal(entries);
    // sum1to6 = 59, no bonus
    expect(totals.sum1to6).toBe(59);
    expect(totals.sum1to6Bonus).toBe(0);
    expect(totals.razlika).toBe(60);
    expect(totals.sumCombinations).toBe(66);
    expect(totals.columnTotal).toBe(59 + 0 + 60 + 66);
  });

  it("calculates FINAL as sum of column totals", () => {
    const col1 = { sum1to6: 50, sum1to6Bonus: 0, razlika: 10, sumCombinations: 66, columnTotal: 126 };
    const col2 = { sum1to6: 60, sum1to6Bonus: 30, razlika: 0, sumCombinations: 80, columnTotal: 170 };
    expect(calculateFinalScore([col1, col2])).toBe(296);
  });
});
