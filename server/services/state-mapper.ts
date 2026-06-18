import { createEmptyScorecard } from "@/lib/yamb/columns";
import { normalizeDice, normalizeHeldDice } from "@/lib/yamb/dice";
import { calculateColumnTotal, calculateFinalScore } from "@/lib/yamb/scoring";
import type {
  ColumnState,
  ColumnTotals,
  ColumnType,
  Dice,
  FillableRowKey,
  HeldDice,
  ScoreEntry,
  TurnState,
} from "@/lib/yamb/types";
import type { RollEventRow, ScoreEntryRow, TurnRow } from "@/server/db/schema";

export function toDice(values: number[]): Dice {
  return normalizeDice(values);
}

export function toHeldDice(values: boolean[]): HeldDice {
  return normalizeHeldDice(values);
}

export function scoreEntriesToColumns(
  rows: ScoreEntryRow[]
): ColumnState[] {
  const columns = createEmptyScorecard();

  for (const row of rows) {
    const column = columns.find((c) => c.columnType === row.columnType);
    if (!column) continue;

    const entry: ScoreEntry = {
      rowKey: row.rowKey as FillableRowKey,
      score: row.score,
      dice: toDice(row.diceSnapshot),
      isManual: row.isManual,
      isNajava: row.isNajava,
      dojavaAccepted: row.dojavaAccepted ?? undefined,
    };
    column.entries[entry.rowKey] = entry;
  }

  return columns;
}

export function turnRowToState(
  turn: TurnRow,
  rollEvents: RollEventRow[]
): TurnState {
  return {
    columnType: turn.columnType as ColumnType,
    rollCount: turn.rollCount,
    dice: toDice(turn.dice),
    heldDice: toHeldDice(turn.heldDice),
    rollHistory: rollEvents
      .sort((a, b) => a.rollNumber - b.rollNumber)
      .map((e) => toDice(e.dice)),
    najavaRowKey: (turn.najavaRowKey as FillableRowKey | null) ?? null,
    status: turn.status as TurnState["status"],
  };
}

export interface PlayerScorecardDto {
  gamePlayerId: string;
  userId: string;
  displayName: string;
  seatOrder: number;
  columns: Array<
    ColumnState & {
      totals: ColumnTotals;
    }
  >;
  finalScore: number;
}

export function buildPlayerScorecard(
  gamePlayerId: string,
  userId: string,
  displayName: string,
  seatOrder: number,
  scoreRows: ScoreEntryRow[]
): PlayerScorecardDto {
  const columns = scoreEntriesToColumns(scoreRows).map((column) => ({
    ...column,
    totals: calculateColumnTotal(column.entries),
  }));

  return {
    gamePlayerId,
    userId,
    displayName,
    seatOrder,
    columns,
    finalScore: calculateFinalScore(columns.map((c) => c.totals)),
  };
}

export interface ActiveTurnDto {
  turnId: string;
  gamePlayerId: string;
  turn: TurnState;
  dojavaSuggestion: { rowKey: FillableRowKey; score: number } | null;
}

export interface LeaderboardEntry {
  gamePlayerId: string;
  userId: string;
  displayName: string;
  seatOrder: number;
  finalScore: number;
  placement: number;
}

export function buildLeaderboard(
  players: PlayerScorecardDto[]
): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => b.finalScore - a.finalScore);
  return sorted.map((p, index) => ({
    gamePlayerId: p.gamePlayerId,
    userId: p.userId,
    displayName: p.displayName,
    seatOrder: p.seatOrder,
    finalScore: p.finalScore,
    placement: index + 1,
  }));
}
