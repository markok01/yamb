import { describe, expect, it } from "vitest";
import { getDojavaSuggestion, getAllPossibleMoves } from "./dojava";
import { createEmptyColumn } from "./columns";

describe("dojava", () => {
  it("prefers combination rows when scores are tied", () => {
    const col = createEmptyColumn("DOJAVA");
    const suggestion = getDojavaSuggestion(col, [6, 6, 6, 6, 1]);
    expect(suggestion?.rowKey).toBe("POKER");
    expect(suggestion?.score).toBe(25);
  });

  it("returns all moves sorted by score", () => {
    const col = createEmptyColumn("DOJAVA");
    const moves = getAllPossibleMoves(col, [6, 6, 6, 6, 1]);
    expect(moves[0].score).toBeGreaterThanOrEqual(moves[moves.length - 1].score);
    expect(moves.length).toBe(13);
  });

  it("returns null for non-DOJAVA column", () => {
    const col = createEmptyColumn("REDOVNA");
    expect(getDojavaSuggestion(col, [1, 2, 3, 4, 5])).toBeNull();
  });
});
