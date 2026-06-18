import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  buildPlayerScorecard,
  scoreEntriesToColumns,
} from "./state-mapper";
import type { ScoreEntryRow } from "@/server/db/schema";

describe("state-mapper", () => {
  it("reconstructs columns from score entries", () => {
    const rows = [
      {
        id: "1",
        gamePlayerId: "p1",
        columnType: "REDOVNA" as const,
        rowKey: "ROW_1" as const,
        score: 3,
        diceSnapshot: [1, 1, 1, 2, 3],
        isManual: false,
        isNajava: false,
        dojavaAccepted: null,
        createdAt: new Date(),
      },
    ] satisfies ScoreEntryRow[];

    const columns = scoreEntriesToColumns(rows);
    const redovna = columns.find((c) => c.columnType === "REDOVNA");
    expect(redovna?.entries.ROW_1?.score).toBe(3);
  });

  it("builds leaderboard sorted by final score", () => {
    const p1 = buildPlayerScorecard("p1", "u1", "Ana", 0, []);
    const p2 = buildPlayerScorecard("p2", "u2", "Marko", 1, []);
    p1.finalScore = 100;
    p2.finalScore = 200;

    const board = buildLeaderboard([p1, p2]);
    expect(board[0].displayName).toBe("Marko");
    expect(board[0].placement).toBe(1);
  });
});
