import { calculateAutoScore } from "./combinations";
import { canFillCell, getAvailableRows } from "./columns";
import type { ColumnState, Dice, DojavaSuggestion, FillableRowKey } from "./types";

/** Prioritet pri izjednačenom skoru (viši = bolji za DOJAVA). */
const DOJAVA_ROW_PRIORITY: Record<FillableRowKey, number> = {
  JAMB: 100,
  POKER: 90,
  FUL: 80,
  TRILING: 70,
  KENTA: 60,
  MAXIMUM: 50,
  MINIMUM: 40,
  ROW_6: 36,
  ROW_5: 35,
  ROW_4: 34,
  ROW_3: 33,
  ROW_2: 32,
  ROW_1: 31,
};

/** Najbolji mogući potez u DOJAVA koloni za trenutne kockice. */
export function getDojavaSuggestion(
  column: ColumnState,
  dice: Dice
): DojavaSuggestion | null {
  if (column.columnType !== "DOJAVA") return null;

  const availableRows = getAvailableRows(column);
  if (availableRows.length === 0) return null;

  let best: DojavaSuggestion | null = null;

  for (const rowKey of availableRows) {
    if (!canFillCell(column, rowKey)) continue;
    const score = calculateAutoScore(rowKey, dice);
    if (
      !best ||
      score > best.score ||
      (score === best.score &&
        DOJAVA_ROW_PRIORITY[rowKey] > DOJAVA_ROW_PRIORITY[best.rowKey])
    ) {
      best = { rowKey, score };
    }
  }

  return best;
}

/** Svi mogući potezi sortirani po score-u (opadajuće). */
export function getAllPossibleMoves(
  column: ColumnState,
  dice: Dice
): DojavaSuggestion[] {
  const availableRows = getAvailableRows(column);
  const moves: DojavaSuggestion[] = availableRows.map((rowKey) => ({
    rowKey,
    score: calculateAutoScore(rowKey, dice),
  }));

  return moves.sort((a, b) => b.score - a.score);
}
