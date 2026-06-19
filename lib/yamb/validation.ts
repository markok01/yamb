import {
  MAKSIMALNA_ALLOWED_SCORES,
  ERROR_MESSAGES,
  MINIMUM_MIN_SCORE,
} from "./constants";
import { calculateAutoScore, isCombinationValid } from "./combinations";
import {
  canFillCell,
  isCellEmpty,
  isObaveznaLocked,
  isValidNajava,
} from "./columns";
import { isValidDice, mustSubmitScore } from "./dice";
import type {
  ColumnState,
  ColumnType,
  Dice,
  FillableRowKey,
  ScoreEntry,
  TurnState,
  ValidationResult,
} from "./types";

function fail(errorCode: string, message: string): ValidationResult {
  return { valid: false, errorCode, message };
}

function ok(): ValidationResult {
  return { valid: true };
}

export function validateMinimumScore(
  rowKey: FillableRowKey,
  score: number
): ValidationResult {
  if (rowKey === "MINIMUM" && score < MINIMUM_MIN_SCORE) {
    return fail("MINIMUM_TOO_LOW", ERROR_MESSAGES.MINIMUM_TOO_LOW);
  }
  return ok();
}

export function validateMaksimalnaScore(
  rowKey: FillableRowKey,
  score: number
): ValidationResult {
  const allowed = MAKSIMALNA_ALLOWED_SCORES[rowKey];
  if (!allowed.includes(score)) {
    return fail("MAKSIMALNA_INVALID", ERROR_MESSAGES.MAKSIMALNA_INVALID);
  }
  return ok();
}

export function validateScoreForDice(
  rowKey: FillableRowKey,
  dice: Dice,
  score: number,
  columnType: ColumnType
): ValidationResult {
  if (!isValidDice(dice)) {
    return fail("INVALID_DICE", "Kockice nisu validne");
  }

  if (columnType === "MAKSIMALNA") {
    return validateMaksimalnaScore(rowKey, score);
  }

  const minimumCheck = validateMinimumScore(rowKey, score);
  if (!minimumCheck.valid) return minimumCheck;

  const autoScore = calculateAutoScore(rowKey, dice);
  if (score !== autoScore) {
    return fail("SCORE_MISMATCH", ERROR_MESSAGES.SCORE_MISMATCH);
  }

  return ok();
}

export function validateManualScore(
  rowKey: FillableRowKey,
  dice: Dice,
  score: number,
  columnType: ColumnType
): ValidationResult {
  if (columnType !== "RUCNA" && columnType !== "MAKSIMALNA") {
    return validateScoreForDice(rowKey, dice, score, columnType);
  }

  if (columnType === "MAKSIMALNA") {
    return validateMaksimalnaScore(rowKey, score);
  }

  const minimumCheck = validateMinimumScore(rowKey, score);
  if (!minimumCheck.valid) return minimumCheck;

  // RUČNA: igrač unosi rezultat, sistem validira kombinaciju
  if (!isValidDice(dice)) {
    return fail("INVALID_DICE", "Kockice nisu validne");
  }

  const autoScore = calculateAutoScore(rowKey, dice);

  if (score === autoScore) return ok();

  // Dozvoljen unos 0 ako kombinacija nije validna
  if (score === 0 && !isCombinationValid(rowKey, dice)) return ok();

  // Za kombinacije: score mora biti 0 ili autoScore
  if (
    ["KENTA", "TRILING", "FUL", "POKER", "JAMB"].includes(rowKey) &&
    score === 0
  ) {
    return ok();
  }

  return fail("SCORE_MISMATCH", ERROR_MESSAGES.SCORE_MISMATCH);
}

export function validateRelaxedColumnAccess(
  column: ColumnState,
  allColumns: ColumnState[],
  targetRow: FillableRowKey
): ValidationResult {
  if (column.columnType === "OBAVEZNA" && isObaveznaLocked(allColumns)) {
    return fail("OBAVEZNA_LOCKED", ERROR_MESSAGES.OBAVEZNA_LOCKED);
  }

  if (!isCellEmpty(column, targetRow)) {
    return fail("CELL_ALREADY_FILLED", ERROR_MESSAGES.CELL_ALREADY_FILLED);
  }

  return ok();
}

export function validateColumnAccess(
  column: ColumnState,
  allColumns: ColumnState[],
  targetRow: FillableRowKey
): ValidationResult {
  if (column.columnType === "OBAVEZNA" && isObaveznaLocked(allColumns)) {
    return fail("OBAVEZNA_LOCKED", ERROR_MESSAGES.OBAVEZNA_LOCKED);
  }

  if (!canFillCell(column, targetRow)) {
    if (column.columnType === "REDOVNA") {
      return fail("COLUMN_ORDER_VIOLATION", ERROR_MESSAGES.COLUMN_ORDER_VIOLATION);
    }
    if (column.columnType === "OBRNUTA") {
      return fail("COLUMN_REVERSE_ORDER", ERROR_MESSAGES.COLUMN_REVERSE_ORDER);
    }
    if (column.columnType === "DVOSTRUKA" || column.columnType === "UKRSTENA") {
      return fail("COLUMN_ORDER_VIOLATION", ERROR_MESSAGES.COLUMN_ORDER_VIOLATION);
    }
    return fail("CELL_ALREADY_FILLED", ERROR_MESSAGES.CELL_ALREADY_FILLED);
  }

  return ok();
}

/** Najava u koloni N obavezuje sledećeg igrača da popuni isto polje u koloni D. */
export function validateNajavaDojavaTarget(
  allColumns: ColumnState[],
  rowKey: FillableRowKey
): ValidationResult {
  const dojavaColumn = allColumns.find((c) => c.columnType === "DOJAVA");
  if (!dojavaColumn) {
    return fail("COLUMN_NOT_FOUND", "Kolona Dirigovana nije pronađena");
  }

  if (!canFillCell(dojavaColumn, rowKey)) {
    return fail(
      "NAJAVA_DIRECT_UNAVAILABLE",
      ERROR_MESSAGES.NAJAVA_DIRECT_UNAVAILABLE
    );
  }

  return validateColumnAccess(dojavaColumn, allColumns, rowKey);
}

export function validateNajavaBeforeRoll(
  column: ColumnState,
  rowKey: FillableRowKey,
  rollCount: number,
  allColumns?: ColumnState[]
): ValidationResult {
  if (column.columnType !== "NAJAVA") return ok();

  if (rollCount > 0) {
    return fail("NAJAVA_LOCKED", ERROR_MESSAGES.NAJAVA_LOCKED);
  }

  if (!isValidNajava(column, rowKey)) {
    return fail("NAJAVA_INVALID", ERROR_MESSAGES.NAJAVA_INVALID);
  }

  return ok();
}

export function validateNajavaSubmit(
  turn: TurnState,
  targetRow: FillableRowKey
): ValidationResult {
  if (turn.columnType !== "NAJAVA") return ok();

  if (!turn.najavaRowKey) {
    return fail("NAJAVA_REQUIRED", ERROR_MESSAGES.NAJAVA_REQUIRED);
  }

  if (turn.najavaRowKey !== targetRow) {
    return fail("NAJAVA_LOCKED", ERROR_MESSAGES.NAJAVA_LOCKED);
  }

  return ok();
}

export function validateRoll(turn: TurnState): ValidationResult {
  if (turn.status !== "ACTIVE") {
    return fail("TURN_NOT_ACTIVE", "Potez nije aktivan");
  }

  if (turn.columnType === "NAJAVA" && !turn.najavaRowKey) {
    return fail("NAJAVA_REQUIRED", ERROR_MESSAGES.NAJAVA_REQUIRED);
  }

  if (turn.rollCount >= 3) {
    return fail("MAX_ROLLS_EXCEEDED", ERROR_MESSAGES.MAX_ROLLS_EXCEEDED);
  }

  return ok();
}

export function validateSubmitScore(
  turn: TurnState,
  column: ColumnState,
  allColumns: ColumnState[],
  targetRow: FillableRowKey,
  score: number,
  options?: {
    isManual?: boolean;
    dojavaAccepted?: boolean;
    relaxedColumnOrder?: boolean;
  }
): ValidationResult {
  if (turn.status !== "ACTIVE") {
    return fail("TURN_NOT_ACTIVE", "Potez nije aktivan");
  }

  if (turn.rollCount === 0) {
    return fail("NO_ROLL_BEFORE_SCORE", ERROR_MESSAGES.NO_ROLL_BEFORE_SCORE);
  }

  const accessCheck = options?.relaxedColumnOrder
    ? validateRelaxedColumnAccess(column, allColumns, targetRow)
    : validateColumnAccess(column, allColumns, targetRow);
  if (!accessCheck.valid) return accessCheck;

  const najavaCheck = validateNajavaSubmit(turn, targetRow);
  if (!najavaCheck.valid) return najavaCheck;

  if (column.columnType === "DOJAVA" && options?.dojavaAccepted === undefined) {
    // Dirigovana: upis vrši sledeći igrač preko servera; lokalni engine tretira kao slobodnu kolonu
  }

  const isManual = options?.isManual ?? column.columnType === "RUCNA";
  const scoreCheck = isManual
    ? validateManualScore(targetRow, turn.dice, score, column.columnType)
    : validateScoreForDice(targetRow, turn.dice, score, column.columnType);

  if (!scoreCheck.valid) return scoreCheck;

  if (mustSubmitScore(turn.rollCount) === false && turn.rollCount < 3) {
    // Dozvoljen raniji upis posle bar jednog bacanja
  }

  return ok();
}

/** Da li igrač unosi stvarne vrednosti kockica (1–6). */
export function hasProvidedDice(dice: Dice): boolean {
  return dice.every((d) => d >= 1 && d <= 6);
}

/** Validacija rezultata u režimu fizičkih kockica. */
export function validatePhysicalScore(
  rowKey: FillableRowKey,
  dice: Dice,
  score: number,
  columnType: ColumnType
): ValidationResult {
  if (columnType === "MAKSIMALNA") {
    return validateMaksimalnaScore(rowKey, score);
  }

  if (hasProvidedDice(dice)) {
    const manualColumn: ColumnType =
      columnType === "RUCNA" ? "RUCNA" : "RUCNA";
    return validateManualScore(rowKey, dice, score, manualColumn);
  }

  if (!Number.isInteger(score) || score < 0) {
    return fail("INVALID_SCORE", "Rezultat mora biti ceo broj ≥ 0");
  }

  return ok();
}

/** Ručna ispravka unosa — dozvoljava slobodnu promenu broja tokom partije. */
export function validateScoreCorrection(
  rowKey: FillableRowKey,
  score: number,
  columnType: ColumnType,
  _dice: Dice,
  _isManual: boolean
): ValidationResult {
  if (columnType === "MAKSIMALNA") {
    return validateMaksimalnaScore(rowKey, score);
  }

  const minimumCheck = validateMinimumScore(rowKey, score);
  if (!minimumCheck.valid) return minimumCheck;

  if (!Number.isInteger(score) || score < 0) {
    return fail("INVALID_SCORE", "Rezultat mora biti ceo broj ≥ 0");
  }

  return ok();
}

/** Submit u PHYSICAL režimu — bez virtuelnog bacanja. */
export function validatePhysicalSubmit(
  turn: TurnState,
  column: ColumnState,
  allColumns: ColumnState[],
  targetRow: FillableRowKey,
  score: number,
  dice: Dice
): ValidationResult {
  if (turn.status !== "ACTIVE") {
    return fail("TURN_NOT_ACTIVE", "Potez nije aktivan");
  }

  const accessCheck = validateColumnAccess(column, allColumns, targetRow);
  if (!accessCheck.valid) return accessCheck;

  const najavaCheck = validateNajavaSubmit(turn, targetRow);
  if (!najavaCheck.valid) return najavaCheck;

  return validatePhysicalScore(targetRow, dice, score, column.columnType);
}

export function validateNewTurn(
  activeTurn: TurnState | null
): ValidationResult {
  if (activeTurn && activeTurn.status === "ACTIVE") {
    return fail("TURN_IN_PROGRESS", ERROR_MESSAGES.TURN_IN_PROGRESS);
  }
  return ok();
}

export function createScoreEntry(
  rowKey: FillableRowKey,
  score: number,
  dice: Dice,
  options?: {
    isManual?: boolean;
    isNajava?: boolean;
    dojavaAccepted?: boolean;
  }
): ScoreEntry {
  return {
    rowKey,
    score,
    dice: [...dice] as Dice,
    isManual: options?.isManual,
    isNajava: options?.isNajava,
    dojavaAccepted: options?.dojavaAccepted,
  };
}
