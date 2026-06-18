import {
  COLUMN_ORDER,
  DVOSTRUKA_LOWER_ORDER,
  DVOSTRUKA_UPPER_ORDER,
  FILLABLE_ROWS_BOTTOM_TO_TOP,
  FILLABLE_ROWS_COUNT,
  FILLABLE_ROWS_TOP_TO_BOTTOM,
  OBAVEZNA_UNLOCK_THRESHOLD,
  OTHER_COLUMNS_COUNT,
  UKRSTENA_LOWER_ORDER,
  UKRSTENA_UPPER_ORDER,
} from "./constants";
import { countFilledCells } from "./scoring";
import type { ColumnState, ColumnType, FillableRowKey } from "./types";

function getFilledRows(column: ColumnState): FillableRowKey[] {
  return Object.keys(column.entries) as FillableRowKey[];
}

function getNextInOrder(
  order: readonly FillableRowKey[],
  filledRows: FillableRowKey[]
): FillableRowKey | null {
  for (const row of order) {
    if (!filledRows.includes(row)) return row;
  }
  return null;
}

function validateSequentialOrder(
  order: readonly FillableRowKey[],
  filledRows: FillableRowKey[],
  targetRow: FillableRowKey
): boolean {
  const next = getNextInOrder(order, filledRows);
  return next === targetRow;
}

/**
 * Kolone sa dve grane (DVOSTRUKA, UKRSTENA): igrač bira od koje strane kreće,
 * popunjava celu granu redom, pa drugu granu redom.
 */
function validateDualBranchOrder(
  column: ColumnState,
  targetRow: FillableRowKey,
  upperOrder: readonly FillableRowKey[],
  lowerOrder: readonly FillableRowKey[]
): boolean {
  const filledRows = getFilledRows(column);

  if (filledRows.includes(targetRow)) return false;

  const filledUpper = filledRows.filter((row) => upperOrder.includes(row));
  const filledLower = filledRows.filter((row) => lowerOrder.includes(row));
  const upperComplete = upperOrder.every((row) => column.entries[row] != null);
  const lowerComplete = lowerOrder.every((row) => column.entries[row] != null);
  const targetInUpper = upperOrder.includes(targetRow);
  const targetInLower = lowerOrder.includes(targetRow);

  if (filledRows.length === 0) {
    return targetRow === upperOrder[0] || targetRow === lowerOrder[0];
  }

  if (filledUpper.length > 0 && filledLower.length === 0 && !upperComplete) {
    if (!targetInUpper) return false;
    return validateSequentialOrder(upperOrder, filledRows, targetRow);
  }

  if (filledLower.length > 0 && filledUpper.length === 0 && !lowerComplete) {
    if (!targetInLower) return false;
    return validateSequentialOrder(lowerOrder, filledRows, targetRow);
  }

  if (upperComplete && !lowerComplete) {
    if (!targetInLower) return false;
    if (filledLower.length === 0) return targetRow === lowerOrder[0];
    return validateSequentialOrder(lowerOrder, filledRows, targetRow);
  }

  if (lowerComplete && !upperComplete) {
    if (!targetInUpper) return false;
    if (filledUpper.length === 0) return targetRow === upperOrder[0];
    return validateSequentialOrder(upperOrder, filledRows, targetRow);
  }

  return false;
}

function validateDvostrukaOrder(
  column: ColumnState,
  targetRow: FillableRowKey
): boolean {
  return validateDualBranchOrder(
    column,
    targetRow,
    DVOSTRUKA_UPPER_ORDER,
    DVOSTRUKA_LOWER_ORDER
  );
}

function validateUkrstenaOrder(
  column: ColumnState,
  targetRow: FillableRowKey
): boolean {
  return validateDualBranchOrder(
    column,
    targetRow,
    UKRSTENA_UPPER_ORDER,
    UKRSTENA_LOWER_ORDER
  );
}

/** Da li je polje slobodno za popunjavanje u datoj koloni. */
export function isCellEmpty(column: ColumnState, rowKey: FillableRowKey): boolean {
  return column.entries[rowKey] === undefined;
}

/** Da li je najava validna (polje prazno i dozvoljeno pravilima kolone). */
export function isValidNajava(
  column: ColumnState,
  rowKey: FillableRowKey
): boolean {
  if (!isCellEmpty(column, rowKey)) return false;
  return canFillCell(column, rowKey);
}

/** Provera redosleda popunjavanja za datu kolonu. */
export function canFillCell(column: ColumnState, targetRow: FillableRowKey): boolean {
  if (!isCellEmpty(column, targetRow)) return false;

  const filledRows = getFilledRows(column);

  switch (column.columnType) {
    case "PREKOREDA":
    case "RUCNA":
    case "DOJAVA":
    case "OBAVEZNA":
      return true;

    case "REDOVNA":
      return validateSequentialOrder(
        FILLABLE_ROWS_TOP_TO_BOTTOM,
        filledRows,
        targetRow
      );

    case "OBRNUTA":
      return validateSequentialOrder(
        FILLABLE_ROWS_BOTTOM_TO_TOP,
        filledRows,
        targetRow
      );

    case "NAJAVA":
      return isCellEmpty(column, targetRow);

    case "DVOSTRUKA":
      return validateDvostrukaOrder(column, targetRow);

    case "UKRSTENA":
      return validateUkrstenaOrder(column, targetRow);

    case "MAKSIMALNA":
      return true;

    default:
      return false;
  }
}

/** Procenat popunjenosti ostalih kolona (bez OBAVEZNA). */
export function calculateOtherColumnsFillPercent(
  columns: ColumnState[],
  excludeObavezna = true
): number {
  const relevant = excludeObavezna
    ? columns.filter((c) => c.columnType !== "OBAVEZNA")
    : columns;

  const totalCells = relevant.length * FILLABLE_ROWS_COUNT;
  if (totalCells === 0) return 0;

  const filledCells = relevant.reduce(
    (acc, col) => acc + countFilledCells(col.entries),
    0
  );

  return filledCells / totalCells;
}

/** OBAVEZNA kolona otključana kada je ≥70% ostalih kolona popunjeno. */
export function isObaveznaUnlocked(allColumns: ColumnState[]): boolean {
  const otherColumns = allColumns.filter((c) => c.columnType !== "OBAVEZNA");
  const fillPercent = calculateOtherColumnsFillPercent(otherColumns, false);
  return fillPercent >= OBAVEZNA_UNLOCK_THRESHOLD;
}

export function isObaveznaLocked(allColumns: ColumnState[]): boolean {
  return !isObaveznaUnlocked(allColumns);
}

/** Slobodna polja u koloni koja su dozvoljena pravilima redosleda. */
export function getAvailableRows(column: ColumnState): FillableRowKey[] {
  return FILLABLE_ROWS_TOP_TO_BOTTOM.filter(
    (row) => canFillCell(column, row)
  );
}

export function createEmptyColumn(columnType: ColumnType): ColumnState {
  return { columnType, entries: {} };
}

export function createEmptyScorecard(): ColumnState[] {
  return COLUMN_ORDER.map(createEmptyColumn);
}

export function getColumnByType(
  columns: ColumnState[],
  columnType: ColumnType
): ColumnState | undefined {
  return columns.find((c) => c.columnType === columnType);
}

/** Svi popunjivi redovi popunjeni u koloni. */
export function isColumnComplete(column: ColumnState): boolean {
  return FILLABLE_ROWS_TOP_TO_BOTTOM.every((row) => !isCellEmpty(column, row));
}

/** Cela tabela popunjena. */
export function isScorecardComplete(columns: ColumnState[]): boolean {
  return columns.every(isColumnComplete);
}

export { OTHER_COLUMNS_COUNT, FILLABLE_ROWS_COUNT };
