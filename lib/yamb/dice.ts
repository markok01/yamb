import {
  DICE_COUNT,
  MAX_HELD_DICE,
  MAX_ROLLS_PER_TURN,
  SCORING_DICE_COUNT,
} from "./constants";
import type { Dice, HeldDice } from "./types";

export function createEmptyDice(): Dice {
  return Array.from({ length: DICE_COUNT }, () => 0) as Dice;
}

export function createEmptyHeldDice(): HeldDice {
  return Array.from({ length: DICE_COUNT }, () => false) as HeldDice;
}

export function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(
  currentDice: Dice,
  heldDice: HeldDice,
  rng: () => number = rollSingleDie
): Dice {
  const next: Dice = [...currentDice] as Dice;
  for (let i = 0; i < DICE_COUNT; i++) {
    if (!heldDice[i]) {
      next[i] = rng();
    }
  }
  return next;
}

export function toggleHold(heldDice: HeldDice, index: number): HeldDice {
  if (index < 0 || index >= DICE_COUNT) {
    return heldDice;
  }
  const next = [...heldDice] as HeldDice;
  const willHold = !next[index];
  next[index] = willHold;
  if (willHold && next.filter(Boolean).length > MAX_HELD_DICE) {
    return heldDice;
  }
  return next;
}

export function countHeldDice(heldDice: HeldDice): number {
  return heldDice.filter(Boolean).length;
}

export function countValue(dice: readonly number[], value: number): number {
  return dice.filter((d) => d === value).length;
}

export function sumDice(dice: readonly number[]): number {
  return dice.reduce((acc, d) => acc + d, 0);
}

export function isValidDice(dice: readonly number[]): boolean {
  if (dice.length !== DICE_COUNT && dice.length !== SCORING_DICE_COUNT) {
    return false;
  }
  return dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6);
}

export function canRoll(rollCount: number): boolean {
  return rollCount < MAX_ROLLS_PER_TURN;
}

export function mustSubmitScore(rollCount: number): boolean {
  return rollCount >= MAX_ROLLS_PER_TURN;
}

/** Normalizuje legacy snimke sa 5 kockica na 6. */
export function normalizeDice(values: number[]): Dice {
  if (values.length === DICE_COUNT) {
    return values as Dice;
  }
  if (values.length === 5) {
    return [...values, 0] as Dice;
  }
  throw new Error(`Dice mora imati 5 ili ${DICE_COUNT} vrednosti`);
}

/** Normalizuje legacy snimke sa 5 držanja na 6. */
export function normalizeHeldDice(values: boolean[]): HeldDice {
  if (values.length === DICE_COUNT) {
    return values as HeldDice;
  }
  if (values.length === 5) {
    return [...values, false] as HeldDice;
  }
  throw new Error(`HeldDice mora imati 5 ili ${DICE_COUNT} vrednosti`);
}
