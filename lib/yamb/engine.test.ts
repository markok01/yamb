import { describe, expect, it } from "vitest";
import { getDojavaSuggestion } from "./dojava";
import { createEmptyColumn, createEmptyScorecard } from "./columns";
import {
  createEngineState,
  roll,
  setHold,
  setNajava,
  startTurn,
  submitScore,
} from "./engine";

describe("engine", () => {
  const columns = createEmptyScorecard();
  const baseState = createEngineState(columns);

  it("starts and completes a basic turn", () => {
    let state = baseState;
    const start = startTurn(state, "PREKOREDA");
    expect(start.result.valid).toBe(true);
    state = start.state;

    const r1 = roll(state, () => 1);
    expect(r1.result.valid).toBe(true);
    state = r1.state;

    const submit = submitScore(state, "ROW_1");
    expect(submit.result.valid).toBe(true);
    expect(submit.entry?.score).toBe(5);
    expect(submit.state.activeTurn).toBeNull();
  });

  it("preserves held dice across rolls", () => {
    let state = baseState;
    state = startTurn(state, "PREKOREDA").state;

    state = roll(state, () => 6).state;
    state = setHold(state, 0).state;
    state = setHold(state, 1).state;

    const values = [3, 4, 5, 2];
    let idx = 0;
    state = roll(state, () => values[idx++]).state;

    expect(state.activeTurn?.dice[0]).toBe(6);
    expect(state.activeTurn?.dice[1]).toBe(6);
    expect(state.activeTurn?.dice[2]).toBe(3);
    expect(state.activeTurn?.dice[3]).toBe(4);
  });

  it("blocks second turn while one is active", () => {
    let state = baseState;
    state = startTurn(state, "PREKOREDA").state;
    const second = startTurn(state, "REDOVNA");
    expect(second.result.valid).toBe(false);
  });

  it("enforces NAJAVA flow", () => {
    let state = baseState;
    state = startTurn(state, "NAJAVA").state;

    const blockedRoll = roll(state);
    expect(blockedRoll.result.valid).toBe(false);

    state = setNajava(state, "KENTA").state;
    state = roll(state, () => 1).state;
    // Need kenta: 1,2,3,4,5 - force with multiple rolls
    state = roll(state, () => 2).state;
    state = roll(state, () => 3).state;
    // dice won't be kenta with sequential rng - use manual dice
    if (state.activeTurn) {
      state = {
        ...state,
        activeTurn: {
          ...state.activeTurn,
          dice: [1, 2, 3, 4, 5, 6],
          rollCount: 1,
        },
      };
    }

    const submit = submitScore(state, "KENTA");
    expect(submit.result.valid).toBe(true);
    expect(submit.entry?.score).toBe(66);
  });

  it("suggests best move in DOJAVA column", () => {
    const col = createEmptyColumn("DOJAVA");
    const suggestion = getDojavaSuggestion(col, [6, 6, 6, 6, 1, 2]);
    expect(suggestion?.rowKey).toBe("POKER");
    expect(suggestion?.score).toBe(26);
  });

  it("handles DOJAVA accept", () => {
    let state = createEngineState(columns.map((c) =>
      c.columnType === "DOJAVA" ? createEmptyColumn("DOJAVA") : { ...c, entries: { ...c.entries } }
    ));
    // Fresh columns
    state = createEngineState(createEmptyScorecard());
    state = startTurn(state, "DOJAVA").state;
    state = roll(state, () => 6).state;
    if (state.activeTurn) {
      state = {
        ...state,
        activeTurn: {
          ...state.activeTurn,
          dice: [6, 6, 6, 6, 1, 2],
          rollCount: 1,
        },
      };
    }

    const submit = submitScore(state, "ROW_1", { dojavaAccepted: true });
    expect(submit.result.valid).toBe(true);
    expect(submit.entry?.rowKey).toBe("POKER");
  });

  it("enforces max 3 rolls", () => {
    let state = baseState;
    state = startTurn(state, "PREKOREDA").state;
    state = roll(state, () => 1).state;
    state = roll(state, () => 2).state;
    state = roll(state, () => 3).state;
    const fourth = roll(state, () => 4);
    expect(fourth.result.valid).toBe(false);
  });

  it("resets turn state after submit", () => {
    let state = baseState;
    state = startTurn(state, "PREKOREDA").state;
    state = roll(state, () => 1).state;
    state = submitScore(state, "ROW_1").state;

    expect(state.activeTurn).toBeNull();
    const col = state.columns.find((c) => c.columnType === "PREKOREDA");
    expect(col?.entries.ROW_1).toBeDefined();
  });
});
