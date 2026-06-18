import { calculateAutoScore } from "./combinations";
import {
  isFul,
  isJamb,
  isKenta,
  isPoker,
  isTriling,
} from "./combinations";
import {
  canFillCell,
  getAvailableRows,
  isObaveznaLocked,
} from "./columns";
import { COLUMN_ORDER, MAKSIMALNA_ALLOWED_SCORES } from "./constants";
import { getActiveTurn, type YambEngineState } from "./engine";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";
import { VIRTUAL_ROLL_PLACEHOLDER } from "@/lib/ui/virtual-roll-first";
import type {
  ColumnType,
  Dice,
  FillableRowKey,
  HeldDice,
} from "./types";

export const AI_BOT_DISPLAY_NAME = "Računar 🤖";

export type AiDifficulty = "easy" | "medium" | "hard";

export type AiMove =
  | { type: "start_turn"; columnType: ColumnType }
  | { type: "najava"; rowKey: FillableRowKey }
  | { type: "direct"; rowKey: FillableRowKey }
  | { type: "roll" }
  | { type: "toggle_hold"; index: number }
  | {
      type: "submit";
      rowKey: FillableRowKey;
      columnType?: ColumnType;
      score?: number;
      isManual?: boolean;
    };

export function isAiDisplayName(displayName: string): boolean {
  return displayName === AI_BOT_DISPLAY_NAME;
}

const COMBO_BONUS: Partial<Record<FillableRowKey, number>> = {
  JAMB: 45,
  POKER: 28,
  FUL: 22,
  TRILING: 18,
  KENTA: 20,
};

function rngSpread(difficulty: AiDifficulty, rng: () => number): number {
  const spread =
    difficulty === "easy" ? 0.35 : difficulty === "medium" ? 0.2 : 0.06;
  return 1 + (rng() * 2 - 1) * spread;
}

function comboBonus(rowKey: FillableRowKey, dice: Dice): number {
  switch (rowKey) {
    case "JAMB":
      return isJamb(dice) ? (COMBO_BONUS.JAMB ?? 0) : 0;
    case "POKER":
      return isPoker(dice) ? (COMBO_BONUS.POKER ?? 0) : 0;
    case "FUL":
      return isFul(dice) ? (COMBO_BONUS.FUL ?? 0) : 0;
    case "TRILING":
      return isTriling(dice) ? (COMBO_BONUS.TRILING ?? 0) : 0;
    case "KENTA":
      return isKenta(dice) ? (COMBO_BONUS.KENTA ?? 0) : 0;
    default:
      return 0;
  }
}

function scoreRowCandidate(
  rowKey: FillableRowKey,
  dice: Dice,
  difficulty: AiDifficulty,
  rng: () => number
): number {
  const base = calculateAutoScore(rowKey, dice);
  let score = base + comboBonus(rowKey, dice);
  if (base === 0) score -= 12;
  return score * rngSpread(difficulty, rng);
}

function pickFromRanked<T>(
  ranked: T[],
  difficulty: AiDifficulty,
  rng: () => number
): T {
  if (ranked.length === 0) throw new Error("No candidates");
  if (difficulty === "easy") {
    return ranked[Math.floor(rng() * ranked.length)]!;
  }
  const pickTop = rng() < 0.7;
  if (pickTop || ranked.length === 1) return ranked[0]!;
  const alt = Math.min(ranked.length - 1, 1 + Math.floor(rng() * 2));
  return ranked[alt]!;
}

function validColumns(state: YambEngineState): ColumnType[] {
  return COLUMN_ORDER.filter((colType) => {
    if (colType === "OBAVEZNA" && isObaveznaLocked(state.columns)) return false;
    const col = state.columns.find((c) => c.columnType === colType);
    if (!col) return false;
    return getAvailableRows(col).some((row) => canFillCell(col, row));
  });
}

function rankColumnStarts(
  state: YambEngineState,
  difficulty: AiDifficulty,
  rng: () => number
): { columnType: ColumnType; score: number }[] {
  const cols = validColumns(state);
  const ranked = cols.map((columnType) => {
    const col = state.columns.find((c) => c.columnType === columnType)!;
    const rows = getAvailableRows(col).filter((r) => canFillCell(col, r));
    const bestRow = rows
      .map((rowKey) => ({
        rowKey,
        score: scoreRowCandidate(rowKey, [3, 3, 3, 4, 4] as Dice, difficulty, rng),
      }))
      .sort((a, b) => b.score - a.score)[0];
    const fillRatio =
      Object.keys(col.entries).length / Math.max(getAvailableRows(col).length, 1);
    const urgency = columnType === "OBAVEZNA" ? 15 : 0;
    return {
      columnType,
      score: (bestRow?.score ?? 5) + fillRatio * 8 + urgency,
    };
  });
  return ranked.sort((a, b) => b.score - a.score);
}

function rankSubmitMoves(
  state: YambEngineState,
  difficulty: AiDifficulty,
  rng: () => number
): { rowKey: FillableRowKey; score: number }[] {
  const turn = getActiveTurn(state);
  if (!turn) return [];

  const column = state.columns.find((c) => c.columnType === turn.columnType)!;
  const dice = turn.dice;

  if (column.columnType === "MAKSIMALNA") {
    return getAvailableRows(column)
      .filter((row) => canFillCell(column, row))
      .map((rowKey) => ({
        rowKey,
        score:
          (MAKSIMALNA_ALLOWED_SCORES[rowKey]?.[0] ?? 0) *
          rngSpread(difficulty, rng),
      }))
      .sort((a, b) => b.score - a.score);
  }

  const moves = getAvailableRows(column)
    .filter((row) => canFillCell(column, row))
    .map((rowKey) => ({
      rowKey,
      score: calculateAutoScore(rowKey, dice),
    }));

  return moves
    .map((m) => ({
      rowKey: m.rowKey,
      score: scoreRowCandidate(m.rowKey, dice, difficulty, rng),
    }))
    .sort((a, b) => b.score - a.score);
}

function idealHoldIndices(dice: Dice, targetRow: FillableRowKey): boolean[] {
  const holds: boolean[] = [false, false, false, false, false];
  const counts = new Map<number, number>();
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);

  if (targetRow.startsWith("ROW_")) {
    const v = parseInt(targetRow.replace("ROW_", ""), 10);
    dice.forEach((d, i) => {
      if (d === v) holds[i] = true;
    });
    return holds;
  }

  if (
    [
      "MAXIMUM",
      "MINIMUM",
      "KENTA",
      "TRILING",
      "FUL",
      "POKER",
      "JAMB",
    ].includes(targetRow)
  ) {
    let bestVal = 0;
    let bestCount = 0;
    for (let v = 1; v <= 6; v++) {
      const c = counts.get(v) ?? 0;
      if (c > bestCount) {
        bestCount = c;
        bestVal = v;
      }
    }
    if (bestCount >= 2) {
      dice.forEach((d, i) => {
        if (d === bestVal) holds[i] = true;
      });
    }
    if (targetRow === "KENTA") {
      const sorted = [...new Set(dice)].sort((a, b) => a - b);
      if (sorted.length >= 3) {
        dice.forEach((d, i) => {
          if (sorted.includes(d)) holds[i] = true;
        });
      }
    }
  }

  return holds;
}

function applyHoldMistake(
  holds: boolean[],
  difficulty: AiDifficulty,
  rng: () => number
): boolean[] {
  const mistakeRate =
    difficulty === "easy" ? 0.3 : difficulty === "medium" ? 0.18 : 0.1;
  const next = [...holds];
  for (let i = 0; i < next.length; i++) {
    if (rng() < mistakeRate) next[i] = !next[i];
  }
  return next;
}

function firstHoldToggle(current: HeldDice, desired: boolean[]): number | null {
  for (let i = 0; i < 5; i++) {
    if (current[i] !== desired[i]) return i;
  }
  return null;
}

function shouldSubmitNow(
  bestScore: number,
  rollCount: number,
  difficulty: AiDifficulty,
  rng: () => number
): boolean {
  if (rollCount >= 3) return true;
  const threshold =
    difficulty === "easy" ? 22 : difficulty === "medium" ? 32 : 42;
  if (bestScore >= threshold && rollCount >= 1) return rng() > 0.25;
  if (rollCount >= 2 && bestScore >= 18) return rng() > 0.35;
  return false;
}

function rankGlobalSubmitMoves(
  state: YambEngineState,
  difficulty: AiDifficulty,
  rng: () => number
): {
  columnType: ColumnType;
  rowKey: FillableRowKey;
  score: number;
}[] {
  const turn = getActiveTurn(state);
  if (!turn) return [];

  const dice = turn.dice;
  const moves: {
    columnType: ColumnType;
    rowKey: FillableRowKey;
    score: number;
  }[] = [];

  for (const column of state.columns) {
    if (column.columnType === "NAJAVA") continue;
    if (column.columnType === "DOJAVA") continue;
    if (column.columnType === "OBAVEZNA" && isObaveznaLocked(state.columns)) {
      continue;
    }

    if (column.columnType === "MAKSIMALNA") {
      for (const rowKey of getAvailableRows(column).filter((r) =>
        canFillCell(column, r)
      )) {
        moves.push({
          columnType: "MAKSIMALNA",
          rowKey,
          score:
            (MAKSIMALNA_ALLOWED_SCORES[rowKey]?.[0] ?? 0) *
            rngSpread(difficulty, rng),
        });
      }
      continue;
    }

    for (const rowKey of getAvailableRows(column).filter((r) =>
      canFillCell(column, r)
    )) {
      moves.push({
        columnType: column.columnType,
        rowKey,
        score: scoreRowCandidate(rowKey, dice, difficulty, rng),
      });
    }
  }

  return moves.sort((a, b) => b.score - a.score);
}

/** Ponekad AI najavi polje u koloni D sledećem igraču. */
export function aiChooseDirectMove(
  state: YambEngineState,
  difficulty: AiDifficulty = "medium",
  rng: () => number = Math.random
): { rowKey: FillableRowKey } | null {
  const column = state.columns.find((c) => c.columnType === "DOJAVA");
  if (!column) return null;

  const rows = getAvailableRows(column).filter((row) =>
    canFillCell(column, row)
  );
  if (rows.length === 0) return null;

  const directChance =
    difficulty === "easy" ? 0.12 : difficulty === "medium" ? 0.22 : 0.32;
  if (rng() > directChance) return null;

  const ranked = rows
    .map((rowKey) => ({
      rowKey,
      score: scoreRowCandidate(rowKey, [3, 3, 3, 3, 3] as Dice, difficulty, rng),
    }))
    .sort((a, b) => b.score - a.score);
  const pick = pickFromRanked(ranked, difficulty, rng);
  return { rowKey: pick.rowKey };
}

/** Glavna AI funkcija — bira sledeću akciju na osnovu engine stanja. */
export function aiChooseMove(
  state: YambEngineState,
  difficulty: AiDifficulty = "medium",
  rng: () => number = Math.random,
  directedPlay?: { rowKey: FillableRowKey } | null
): AiMove {
  const turn = getActiveTurn(state);

  if (directedPlay) {
    if (!turn || turn.rollCount === 0) {
      return { type: "roll" };
    }
    const directedRow = directedPlay.rowKey;
    if (shouldSubmitNow(
      scoreRowCandidate(directedRow, turn.dice, difficulty, rng),
      turn.rollCount,
      difficulty,
      rng
    )) {
      return { type: "submit", rowKey: directedRow, columnType: "DOJAVA" };
    }
    if (turn.rollCount < 3) {
      let desired = idealHoldIndices(turn.dice, directedRow);
      desired = applyHoldMistake(desired, difficulty, rng);
      const toggle = firstHoldToggle(turn.heldDice, desired);
      if (toggle !== null) {
        return { type: "toggle_hold", index: toggle };
      }
      return { type: "roll" };
    }
    return { type: "submit", rowKey: directedRow, columnType: "DOJAVA" };
  }

  if (!turn) {
    return { type: "roll" };
  }

  const column = state.columns.find((c) => c.columnType === turn.columnType)!;
  const rollingPhase = turn.columnType === VIRTUAL_ROLL_PLACEHOLDER;

  if (
    turn.columnType === "NAJAVA" &&
    !turn.najavaRowKey &&
    turn.rollCount === 0
  ) {
    const rows = getAvailableRows(column).filter((r) => canFillCell(column, r));
    if (difficulty === "easy") {
      return { type: "najava", rowKey: rows[Math.floor(rng() * rows.length)]! };
    }
    const ranked = rows
      .map((rowKey) => ({
        rowKey,
        score: scoreRowCandidate(rowKey, turn.dice, difficulty, rng),
      }))
      .sort((a, b) => b.score - a.score);
    const pick = pickFromRanked(ranked, difficulty, rng);
    return { type: "najava", rowKey: pick.rowKey };
  }

  if (turn.rollCount === 0) {
    return { type: "roll" };
  }

  const rankedSubmit = rollingPhase
    ? rankGlobalSubmitMoves(state, difficulty, rng)
    : rankSubmitMoves(state, difficulty, rng).map((m) => ({
        columnType: turn.columnType,
        ...m,
      }));
  const best = rankedSubmit[0];
  if (!best) {
    return { type: "roll" };
  }

  if (shouldSubmitNow(best.score, turn.rollCount, difficulty, rng)) {
    if (best.columnType === "MAKSIMALNA") {
      return {
        type: "submit",
        rowKey: best.rowKey,
        columnType: rollingPhase ? best.columnType : undefined,
        score: MAKSIMALNA_ALLOWED_SCORES[best.rowKey]?.[0],
      };
    }
    if (best.columnType === "RUCNA") {
      return {
        type: "submit",
        rowKey: best.rowKey,
        columnType: rollingPhase ? best.columnType : undefined,
        score: calculateAutoScore(best.rowKey, turn.dice),
        isManual: true,
      };
    }
    return {
      type: "submit",
      rowKey: best.rowKey,
      columnType: rollingPhase ? best.columnType : undefined,
    };
  }

  if (turn.rollCount < 3) {
    let desired = idealHoldIndices(turn.dice, best.rowKey);
    desired = applyHoldMistake(desired, difficulty, rng);
    const toggle = firstHoldToggle(turn.heldDice, desired);
    if (toggle !== null) {
      return { type: "toggle_hold", index: toggle };
    }
    return { type: "roll" };
  }

  return {
    type: "submit",
    rowKey: best.rowKey,
    columnType: rollingPhase ? best.columnType : undefined,
  };
}

export function aiMoveLabel(move: AiMove): string {
  switch (move.type) {
    case "start_turn":
      return `Računar bira kolonu ${COLUMN_NAMES[move.columnType]}`;
    case "najava":
      return "Računar najavljuje polje";
    case "direct":
      return `Računar diriguje ${ROW_LABELS[move.rowKey]}`;
    case "roll":
      return "Računar baca kockice";
    case "toggle_hold":
      return "Računar drži kockice";
    case "submit":
      return "Računar upisuje rezultat";
    default:
      return "Računar igra";
  }
}
