import {
  SUM_1_TO_6_BONUS,
  SUM_1_TO_6_BONUS_THRESHOLD,
} from "./constants";
import type { ColumnTotals, FillableRowKey, ScoreEntry } from "./types";

const NUMBER_ROWS: readonly FillableRowKey[] = [
  "ROW_1",
  "ROW_2",
  "ROW_3",
  "ROW_4",
  "ROW_5",
  "ROW_6",
];

const COMBINATION_ROWS: readonly FillableRowKey[] = [
  "KENTA",
  "TRILING",
  "FUL",
  "POKER",
  "JAMB",
];

function getEntryScore(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>,
  rowKey: FillableRowKey
): number {
  return entries[rowKey]?.score ?? 0;
}

/** Σ(1–6): zbir redova 1–6; bonus +30 ako ≥ 60. */
export function calculateSum1to6(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): { sum: number; bonus: number } {
  const sum = NUMBER_ROWS.reduce(
    (acc, row) => acc + getEntryScore(entries, row),
    0
  );
  const bonus = sum >= SUM_1_TO_6_BONUS_THRESHOLD ? SUM_1_TO_6_BONUS : 0;
  return { sum, bonus };
}

/**
 * RAZLIKA: (Maximum − Minimum) × rezultat u polju „1“ (jedinice).
 * Ako su jedinice 0 → razlika je 0.
 */
export function calculateRazlika(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): number {
  if (!entries["MAXIMUM"] || !entries["MINIMUM"]) return 0;

  const maximum = getEntryScore(entries, "MAXIMUM");
  const minimum = getEntryScore(entries, "MINIMUM");
  const onesScore = getEntryScore(entries, "ROW_1");

  if (onesScore === 0) return 0;

  return (maximum - minimum) * onesScore;
}

export function hasAnyNumberRowEntries(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): boolean {
  return NUMBER_ROWS.some((row) => entries[row] !== undefined);
}

export function hasAnyCombinationEntries(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): boolean {
  return COMBINATION_ROWS.some((row) => entries[row] !== undefined);
}

/** Σ(kombinacije): Kenta + Triling + Ful + Poker + Jamb. */
export function calculateSumCombinations(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): number {
  return COMBINATION_ROWS.reduce(
    (acc, row) => acc + getEntryScore(entries, row),
    0
  );
}

/** UKUPNO po koloni: Σ(1–6) + bonus + Razlika + Σ(kombinacije). */
export function calculateColumnTotal(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): ColumnTotals {
  const { sum: sum1to6, bonus: sum1to6Bonus } = calculateSum1to6(entries);
  const razlika = calculateRazlika(entries);
  const sumCombinations = calculateSumCombinations(entries);
  const columnTotal = sum1to6 + sum1to6Bonus + razlika + sumCombinations;

  return {
    sum1to6,
    sum1to6Bonus,
    razlika,
    sumCombinations,
    columnTotal,
  };
}

/** FINAL: zbir UKUPNO svih kolona. */
export function calculateFinalScore(columnTotals: ColumnTotals[]): number {
  return columnTotals.reduce((acc, col) => acc + col.columnTotal, 0);
}

/** Provera da li su Maximum i Minimum popunjeni (potrebno za Razliku). */
export function hasMaxMinForRazlika(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): boolean {
  return entries["MAXIMUM"] !== undefined && entries["MINIMUM"] !== undefined;
}

export function countFilledCells(
  entries: Partial<Record<FillableRowKey, ScoreEntry>>
): number {
  return Object.keys(entries).length;
}
