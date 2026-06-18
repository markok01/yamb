/** Popunjivi redovi u scorecard-u (13 redova). */
export type FillableRowKey =
  | "ROW_1"
  | "ROW_2"
  | "ROW_3"
  | "ROW_4"
  | "ROW_5"
  | "ROW_6"
  | "MAXIMUM"
  | "MINIMUM"
  | "KENTA"
  | "TRILING"
  | "FUL"
  | "POKER"
  | "JAMB";

/** Automatski izračunati redovi. */
export type AutoRowKey = "SUM_1_6" | "RAZLIKA" | "SUM_COMBINATIONS" | "UKUPNO";

export type RowKey = FillableRowKey | AutoRowKey;

export type ColumnType =
  | "REDOVNA"
  | "PREKOREDA"
  | "OBRNUTA"
  | "NAJAVA"
  | "RUCNA"
  | "DOJAVA"
  | "DVOSTRUKA"
  | "UKRSTENA"
  | "OBAVEZNA"
  | "MAKSIMALNA";

export type DiceMode = "VIRTUAL" | "PHYSICAL";

export type ScoringDice = [number, number, number, number, number];

export type Dice = [number, number, number, number, number, number];

export type HeldDice = [boolean, boolean, boolean, boolean, boolean, boolean];

export type TurnStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface ScoreEntry {
  rowKey: FillableRowKey;
  score: number;
  dice: Dice;
  isManual?: boolean;
  isNajava?: boolean;
  dojavaAccepted?: boolean;
}

export interface ColumnState {
  columnType: ColumnType;
  entries: Partial<Record<FillableRowKey, ScoreEntry>>;
}

export interface ColumnTotals {
  sum1to6: number;
  sum1to6Bonus: number;
  razlika: number;
  sumCombinations: number;
  columnTotal: number;
}

export interface TurnState {
  columnType: ColumnType;
  rollCount: number;
  dice: Dice;
  heldDice: HeldDice;
  rollHistory: Dice[];
  najavaRowKey: FillableRowKey | null;
  status: TurnStatus;
}

export interface DojavaSuggestion {
  rowKey: FillableRowKey;
  score: number;
}

export interface ValidationResult {
  valid: boolean;
  errorCode?: string;
  message?: string;
}

export interface GameScorecard {
  columns: Record<ColumnType, ColumnState>;
}
