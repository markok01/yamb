import { DICE_COUNT, MAX_ROLLS_PER_TURN } from "./constants";
import type { Dice, HeldDice } from "./types";

export function createEmptyDice(): Dice {
  return [0, 0, 0, 0, 0];
}

export function createEmptyHeldDice(): HeldDice {
  return [false, false, false, false, false];
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
  next[index] = !next[index];
  return next;
}

export function countValue(dice: Dice, value: number): number {
  return dice.filter((d) => d === value).length;
}

export function sumDice(dice: Dice): number {
  return dice.reduce((acc, d) => acc + d, 0);
}

export function isValidDice(dice: Dice): boolean {
  return (
    dice.length === DICE_COUNT && dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6)
  );
}

export function canRoll(rollCount: number): boolean {
  return rollCount < MAX_ROLLS_PER_TURN;
}

export function mustSubmitScore(rollCount: number): boolean {
  return rollCount >= MAX_ROLLS_PER_TURN;
}
