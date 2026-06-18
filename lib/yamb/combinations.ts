import { countValue, sumDice } from "./dice";
import type { Dice, FillableRowKey } from "./types";

const KENTA_STRAIGHTS: readonly Dice[] = [
  [1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6],
];

function sorted(dice: Dice): number[] {
  return [...dice].sort((a, b) => a - b);
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Kenta: 5 uzastopnih brojeva (1-5 ili 2-6). */
export function isKenta(dice: Dice): boolean {
  const s = sorted(dice);
  return KENTA_STRAIGHTS.some((straight) => arraysEqual(s, straight));
}

/** Triling: 3 iste kockice. */
export function isTriling(dice: Dice): boolean {
  for (let v = 1; v <= 6; v++) {
    if (countValue(dice, v) >= 3) return true;
  }
  return false;
}

/** Ful: 3 + 2 iste. */
export function isFul(dice: Dice): boolean {
  const counts = new Map<number, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const values = [...counts.values()].sort((a, b) => b - a);
  return arraysEqual(values, [3, 2]);
}

/** Poker: 4 iste kockice. */
export function isPoker(dice: Dice): boolean {
  for (let v = 1; v <= 6; v++) {
    if (countValue(dice, v) >= 4) return true;
  }
  return false;
}

/** Jamb: 5 istih kockica. */
export function isJamb(dice: Dice): boolean {
  return countValue(dice, dice[0]) === 5;
}

export function isCombinationValid(rowKey: FillableRowKey, dice: Dice): boolean {
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
      return isKenta(dice);
    case "TRILING":
      return isTriling(dice);
    case "FUL":
      return isFul(dice);
    case "POKER":
      return isPoker(dice);
    case "JAMB":
      return isJamb(dice);
    default:
      return false;
  }
}

/**
 * Automatski rezultat za dati red i kockice (standardna ex-YU pravila).
 * Redovi 1–6: zbir kockica tog broja.
 * Maximum/Minimum: zbir svih kockica.
 * Kenta: 66 ako validna, inače 0.
 * Triling/Ful/Poker/Jamb: zbir svih kockica ako validna kombinacija, inače 0.
 */
export function calculateAutoScore(rowKey: FillableRowKey, dice: Dice): number {
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
