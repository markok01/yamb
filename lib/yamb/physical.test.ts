import { describe, expect, it } from "vitest";
import { createEmptyScorecard, createEngineState, startTurn, submitPhysicalScore } from "./index";
import { validateScoreCorrection } from "./validation";

describe("physical mode", () => {
  it("submits score without virtual roll", () => {
    let state = createEngineState(createEmptyScorecard());
    state = startTurn(state, "PREKOREDA").state;

    const result = submitPhysicalScore(state, "ROW_1", 5, [1, 1, 1, 1, 1]);
    expect(result.result.valid).toBe(true);
    expect(result.entry?.score).toBe(5);
    expect(result.state.activeTurn).toBeNull();
  });

  it("allows scorekeeper entry without dice", () => {
    let state = createEngineState(createEmptyScorecard());
    state = startTurn(state, "PREKOREDA").state;

    const result = submitPhysicalScore(state, "KENTA", 66);
    expect(result.result.valid).toBe(true);
    expect(result.entry?.score).toBe(66);
  });

  it("validates maksimalna in physical mode", () => {
    let state = createEngineState(createEmptyScorecard());
    state = startTurn(state, "MAKSIMALNA").state;

    const invalid = submitPhysicalScore(state, "JAMB", 10);
    expect(invalid.result.valid).toBe(false);

    const valid = submitPhysicalScore(state, "JAMB", 80);
    expect(valid.result.valid).toBe(true);
  });

  it("enforces najava in physical mode", () => {
    let state = createEngineState(createEmptyScorecard());
    state = startTurn(state, "NAJAVA").state;

    const blocked = submitPhysicalScore(state, "KENTA", 66);
    expect(blocked.result.valid).toBe(false);
  });

  it("allows correcting physical entry without dice snapshot", () => {
    const result = validateScoreCorrection(
      "ROW_1",
      6,
      "REDOVNA",
      [0, 0, 0, 0, 0],
      true
    );
    expect(result.valid).toBe(true);
  });
});
