import { describe, expect, it } from "vitest";
import {
  canRoll,
  createEmptyDice,
  createEmptyHeldDice,
  mustSubmitScore,
  normalizeDice,
  rollDice,
  toggleHold,
} from "./dice";

describe("dice", () => {
  it("rolls all dice when none held", () => {
    const held = createEmptyHeldDice();
    const dice = createEmptyDice();
    let callCount = 0;
    const rng = () => {
      callCount++;
      return callCount;
    };
    const result = rollDice(dice, held, rng);
    expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    expect(callCount).toBe(6);
  });

  it("preserves held dice", () => {
    const dice: [number, number, number, number, number, number] = [
      1, 2, 3, 4, 5, 6,
    ];
    const held: [boolean, boolean, boolean, boolean, boolean, boolean] = [
      true,
      false,
      true,
      false,
      true,
      false,
    ];
    let callCount = 0;
    const rng = () => ++callCount + 10;
    const result = rollDice([...dice], held, rng);
    expect(result[0]).toBe(1);
    expect(result[2]).toBe(3);
    expect(result[4]).toBe(5);
    expect(result[1]).toBe(11);
    expect(result[3]).toBe(12);
    expect(result[5]).toBe(13);
  });

  it("toggles hold", () => {
    const held = createEmptyHeldDice();
    const toggled = toggleHold(held, 2);
    expect(toggled[2]).toBe(true);
    expect(toggleHold(toggled, 2)).toEqual(createEmptyHeldDice());
  });

  it("allows at most 5 held dice", () => {
    let held = createEmptyHeldDice();
    for (let i = 0; i < 5; i++) {
      held = toggleHold(held, i);
    }
    expect(held.filter(Boolean).length).toBe(5);
    expect(toggleHold(held, 5)).toEqual(held);
  });

  it("normalizes legacy 5-dice snapshots", () => {
    expect(normalizeDice([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5, 0]);
  });

  it("enforces max 3 rolls", () => {
    expect(canRoll(0)).toBe(true);
    expect(canRoll(2)).toBe(true);
    expect(canRoll(3)).toBe(false);
    expect(mustSubmitScore(3)).toBe(true);
    expect(mustSubmitScore(2)).toBe(false);
  });
});
