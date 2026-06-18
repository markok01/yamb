import { DICE_COUNT, SCORING_DICE_COUNT } from "./constants";
import { countValue, sumDice } from "./dice";
import type { Dice, FillableRowKey, ScoringDice } from "./types";

const KENTA_STRAIGHTS: readonly ScoringDice[] = [
  [1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6],
];

function sorted(dice: readonly number[]): number[] {
  return [...dice].sort((a, b) => a - b);
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function excludeDieAt(dice: Dice, excludeIndex: number): ScoringDice {
  return dice.filter((_, i) => i !== excludeIndex) as ScoringDice;
}

function isBetterFive(
  rowKey: FillableRowKey,
  candidate: ScoringDice,
  best: ScoringDice
): boolean {
  if (rowKey === "MINIMUM") {
    return sumDice(candidate) < sumDice(best);
  }
  return calculateAutoScoreForFive(rowKey, candidate) >
    calculateAutoScoreForFive(rowKey, best);
}

/** Biramo najboljih 5 od 6 kockica za dati red. */
export function bestFiveForScore(dice: Dice, rowKey: FillableRowKey): ScoringDice {
  if (dice.length <= SCORING_DICE_COUNT) {
    return dice.slice(0, SCORING_DICE_COUNT) as ScoringDice;
  }

  let best = excludeDieAt(dice, 0);
  for (let exclude = 1; exclude < DICE_COUNT; exclude++) {
    const candidate = excludeDieAt(dice, exclude);
    if (isBetterFive(rowKey, candidate, best)) {
      best = candidate;
    }
  }
  return best;
}

function asScoringDice(dice: Dice | ScoringDice, rowKey: FillableRowKey): ScoringDice {
  if (dice.length === DICE_COUNT) {
    return bestFiveForScore(dice as Dice, rowKey);
  }
  return dice as ScoringDice;
}

/** Kenta: 5 uzastopnih brojeva (1-5 ili 2-6). */
export function isKenta(dice: ScoringDice): boolean {
  const s = sorted(dice);
  return KENTA_STRAIGHTS.some((straight) => arraysEqual(s, straight));
}

/** Triling: 3 iste kockice. */
export function isTriling(dice: ScoringDice): boolean {
  for (let v = 1; v <= 6; v++) {
    if (countValue(dice, v) >= 3) return true;
  }
  return false;
}

/** Ful: 3 + 2 iste. */
export function isFul(dice: ScoringDice): boolean {
  const counts = new Map<number, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const values = [...counts.values()].sort((a, b) => b - a);
  return arraysEqual(values, [3, 2]);
}

/** Poker: 4 iste kockice. */
export function isPoker(dice: ScoringDice): boolean {
  for (let v = 1; v <= 6; v++) {
    if (countValue(dice, v) >= 4) return true;
  }
  return false;
}

/** Jamb: 5 istih kockica. */
export function isJamb(dice: ScoringDice): boolean {
  return countValue(dice, dice[0]) === SCORING_DICE_COUNT;
}

function calculateAutoScoreForFive(
  rowKey: FillableRowKey,
  dice: ScoringDice
): number {
  switch (rowKey) {
    case "ROW_1":
      return countValue(dice, 1) * 1;
    case "ROW_2":
      return countValue(dice, 2) * 2;
    case "ROW_3":
      return countValue(dice, 3) * 3;
    case "ROW_4":
      return countValue(dice, 4) * 4;
    case "ROW_5":
      return countValue(dice, 5) * 5;
    case "ROW_6":
      return countValue(dice, 6) * 6;
    case "MAXIMUM":
    case "MINIMUM":
      return sumDice(dice);
    case "KENTA":
      return isKenta(dice) ? 66 : 0;
    case "TRILING":
      return isTriling(dice) ? sumDice(dice) : 0;
    case "FUL":
      return isFul(dice) ? sumDice(dice) : 0;
    case "POKER":
      return isPoker(dice) ? sumDice(dice) : 0;
    case "JAMB":
      return isJamb(dice) ? sumDice(dice) : 0;
    default:
      return 0;
  }
}

export function isCombinationValid(
  rowKey: FillableRowKey,
  dice: Dice | ScoringDice
): boolean {
  const five = asScoringDice(dice, rowKey);
  switch (rowKey) {
    case "ROW_1":
    case "ROW_2":
    case "ROW_3":
    case "ROW_4":
    case "ROW_5":
    case "ROW_6":
      return true;
    case "MAXIMUM":
    case "MINIMUM":
      return true;
    case "KENTA":
      return isKenta(five);
    case "TRILING":
      return isTriling(five);
    case "FUL":
      return isFul(five);
    case "POKER":
      return isPoker(five);
    case "JAMB":
      return isJamb(five);
    default:
      return false;
  }
}

/**
 * Automatski rezultat za dati red i kockice (standardna ex-YU pravila).
 * Sa 6 kockica koristi se najboljih 5 za dati red.
 */
export function calculateAutoScore(
  rowKey: FillableRowKey,
  dice: Dice | ScoringDice
): number {
  return calculateAutoScoreForFive(rowKey, asScoringDice(dice, rowKey));
}
