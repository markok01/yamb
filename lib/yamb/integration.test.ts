import { describe, expect, it } from "vitest";
import {
  createEngineState,
  roll,
  startTurn,
  submitScore,
} from "./engine";
import { calculateColumnTotal } from "./scoring";
import { canFillCell, createEmptyScorecard } from "./columns";
import { validateMaksimalnaScore } from "./validation";

describe("integration", () => {
  it("completes full REDOVNA column flow with correct totals", () => {
    let state = createEngineState(createEmptyScorecard());
    const col = state.columns.find((c) => c.columnType === "REDOVNA")!;

    const fills: Array<{ row: keyof typeof col.entries; dice: [number, number, number, number, number]; score: number }> = [
      { row: "ROW_1", dice: [1, 1, 1, 2, 3], score: 3 },
      { row: "ROW_2", dice: [2, 2, 2, 2, 2], score: 10 },
      { row: "ROW_3", dice: [3, 3, 3, 1, 2], score: 9 },
      { row: "ROW_4", dice: [4, 4, 4, 1, 1], score: 12 },
      { row: "ROW_5", dice: [5, 5, 1, 2, 3], score: 10 },
      { row: "ROW_6", dice: [6, 6, 1, 2, 3], score: 12 },
    ];

    for (const fill of fills) {
      expect(canFillCell(col, fill.row)).toBe(true);
      state = startTurn(state, "REDOVNA").state;
      state = roll(state, () => fill.dice[0]).state;
      if (state.activeTurn) {
        state = {
          ...state,
          activeTurn: { ...state.activeTurn, dice: fill.dice, rollCount: 1 },
        };
      }
      const result = submitScore(state, fill.row, { score: fill.score });
      expect(result.result.valid).toBe(true);
      state = result.state;
      Object.assign(col.entries, result.state.columns.find((c) => c.columnType === "REDOVNA")!.entries);
    }

    const redovna = state.columns.find((c) => c.columnType === "REDOVNA")!;
    const partial = calculateColumnTotal(redovna.entries);
    expect(partial.sum1to6).toBe(56);
    expect(partial.sum1to6Bonus).toBe(0);
  });

  it("accepts MAKSIMALNA allowed scores only", () => {
    expect(validateMaksimalnaScore("JAMB", 80).valid).toBe(true);
    expect(validateMaksimalnaScore("JAMB", 10).valid).toBe(false);

    let state = createEngineState(createEmptyScorecard());
    state = startTurn(state, "MAKSIMALNA").state;
    state = roll(state, () => 1).state;
    if (state.activeTurn) {
      state = {
        ...state,
        activeTurn: { ...state.activeTurn, dice: [1, 1, 1, 1, 1], rollCount: 1 },
      };
    }

    const invalid = submitScore(state, "JAMB", { score: 10 });
    expect(invalid.result.valid).toBe(false);

    const valid = submitScore(state, "JAMB", { score: 80 });
    expect(valid.result.valid).toBe(true);
    expect(valid.entry?.score).toBe(80);
  });

  it("DOJAVA column allows manual row choice", () => {
    let state = createEngineState(createEmptyScorecard());
    state = startTurn(state, "DOJAVA").state;
    state = roll(state, () => 1).state;
    if (state.activeTurn) {
      state = {
        ...state,
        activeTurn: {
          ...state.activeTurn,
          dice: [1, 1, 1, 1, 1],
          rollCount: 1,
        },
      };
    }

    const submit = submitScore(state, "ROW_1");
    expect(submit.result.valid).toBe(true);
    expect(submit.entry?.rowKey).toBe("ROW_1");
    expect(submit.entry?.score).toBe(5);
  });
});
