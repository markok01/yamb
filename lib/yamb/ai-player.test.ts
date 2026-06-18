import { describe, expect, it } from "vitest";
import { createEmptyScorecard } from "./columns";
import { createEngineState, roll, startTurn } from "./engine";
import {
  aiChooseMove,
  AI_BOT_DISPLAY_NAME,
  isAiDisplayName,
  type AiMove,
} from "./ai-player";

describe("ai-player", () => {
  it("identifies AI display name", () => {
    expect(isAiDisplayName(AI_BOT_DISPLAY_NAME)).toBe(true);
    expect(isAiDisplayName("Marko")).toBe(false);
  });

  it("starts with roll when no active turn (roll-first)", () => {
    const state = createEngineState(createEmptyScorecard());
    const move = aiChooseMove(state, "medium", () => 0.5);
    expect(move.type).toBe("roll");
  });

  it("rolls on first action after turn start", () => {
    let state = createEngineState(createEmptyScorecard());
    const start = startTurn(state, "REDOVNA");
    expect(start.result.valid).toBe(true);
    state = start.state;

    const move = aiChooseMove(state, "hard", () => 0.5);
    expect(move.type).toBe("roll");
  });

  it("easy difficulty returns valid move types", () => {
    let state = createEngineState(createEmptyScorecard());
    const start = startTurn(state, "PREKOREDA");
    state = start.state;
    const rolled = roll(state);
    state = rolled.state;

    const move = aiChooseMove(state, "easy", () => 0.1);
    const validTypes: AiMove["type"][] = [
      "roll",
      "toggle_hold",
      "submit",
    ];
    expect(validTypes).toContain(move.type);
  });
});
