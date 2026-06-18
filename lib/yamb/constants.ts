import type { ColumnType, FillableRowKey } from "./types";

/** Redosled popunjivih redova od vrha ka dnu tabele. */
export const FILLABLE_ROWS_TOP_TO_BOTTOM: readonly FillableRowKey[] = [
  "ROW_1",
  "ROW_2",
  "ROW_3",
  "ROW_4",
  "ROW_5",
  "ROW_6",
  "MAXIMUM",
  "MINIMUM",
  "KENTA",
  "TRILING",
  "FUL",
  "POKER",
  "JAMB",
] as const;

export const FILLABLE_ROWS_BOTTOM_TO_TOP: readonly FillableRowKey[] = [
  ...FILLABLE_ROWS_TOP_TO_BOTTOM,
].reverse();

/** Gornji deo DVOSTRUKA kolone: Maximum → 1 */
export const DVOSTRUKA_UPPER_ORDER: readonly FillableRowKey[] = [
  "MAXIMUM",
  "ROW_6",
  "ROW_5",
  "ROW_4",
  "ROW_3",
  "ROW_2",
  "ROW_1",
];

/** Donji deo DVOSTRUKA kolone: Minimum → Jamb */
export const DVOSTRUKA_LOWER_ORDER: readonly FillableRowKey[] = [
  "MINIMUM",
  "KENTA",
  "TRILING",
  "FUL",
  "POKER",
  "JAMB",
];

/** Gornji deo UKRŠTENA kolone: 1 → Maximum */
export const UKRSTENA_UPPER_ORDER: readonly FillableRowKey[] = [
  "ROW_1",
  "ROW_2",
  "ROW_3",
  "ROW_4",
  "ROW_5",
  "ROW_6",
  "MAXIMUM",
];

/** Donji deo UKRŠTENA kolone: Jamb → Minimum */
export const UKRSTENA_LOWER_ORDER: readonly FillableRowKey[] = [
  "JAMB",
  "POKER",
  "FUL",
  "TRILING",
  "KENTA",
  "MINIMUM",
];

/** Fiksni redosled kolona u scorecard-u. */
export const COLUMN_ORDER: readonly ColumnType[] = [
  "REDOVNA",
  "PREKOREDA",
  "OBRNUTA",
  "NAJAVA",
  "RUCNA",
  "DOJAVA",
  "DVOSTRUKA",
  "UKRSTENA",
  "OBAVEZNA",
  "MAKSIMALNA",
] as const;

/** Dozvoljene vrednosti u MAKSIMALNA koloni. */
export const MAKSIMALNA_ALLOWED_SCORES: Readonly<
  Record<FillableRowKey, readonly number[]>
> = {
  ROW_1: [5],
  ROW_2: [10],
  ROW_3: [15],
  ROW_4: [20],
  ROW_5: [25],
  ROW_6: [30],
  MAXIMUM: [30],
  MINIMUM: [5],
  KENTA: [66],
  TRILING: [38],
  FUL: [58],
  POKER: [64],
  JAMB: [80],
};

export const SUM_1_TO_6_BONUS_THRESHOLD = 60;
export const SUM_1_TO_6_BONUS = 30;

export const MAX_ROLLS_PER_TURN = 3;
export const DICE_COUNT = 5;

/** OBAVEZNA se otključava kada je ≥70% ostalih kolona popunjeno. */
export const OBAVEZNA_UNLOCK_THRESHOLD = 0.7;

export const FILLABLE_ROWS_COUNT = FILLABLE_ROWS_TOP_TO_BOTTOM.length;
export const OTHER_COLUMNS_COUNT = COLUMN_ORDER.length - 1;

export const ERROR_MESSAGES = {
  COLUMN_ORDER_VIOLATION:
    "Ova kolona mora da se popunjava redom od vrha ka dnu",
  COLUMN_REVERSE_ORDER:
    "Ova kolona mora da se popunjava redom od dna ka vrhu",
  OBAVEZNA_LOCKED:
    "Obavezna kolona se može popunjavati tek nakon ostalih kolona.",
  NAJAVA_REQUIRED: "Morate najaviti polje pre prvog bacanja",
  NAJAVA_LOCKED: "Najava se ne može menjati nakon bacanja",
  NAJAVA_INVALID: "Najava nije validna za ovo polje",
  MAX_ROLLS_EXCEEDED: "Maksimalno 3 bacanja po potezu",
  NO_ROLL_BEFORE_SCORE: "Ne može upis pre prvog bacanja",
  TURN_IN_PROGRESS: "Ne može novi potez dok se ne završi trenutni",
  MAKSIMALNA_INVALID: "Vrednost nije u dozvoljenom skupu",
  COMBINATION_INVALID: "Kombinacija ne odgovara kockicama",
  SCORE_MISMATCH: "Uneti rezultat ne odgovara kockicama",
  CELL_ALREADY_FILLED: "Polje je već popunjeno",
  NOT_YOUR_TURN: "Niste na potezu",
  DOJAVA_REQUIRED: "Dirigovana kolona se koristi preko dirige",
} as const;
