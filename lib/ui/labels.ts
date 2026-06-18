import { COLUMN_ORDER } from "@/lib/yamb/constants";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";

export const COLUMN_LABELS: Record<ColumnType, string> = {
  REDOVNA: "↓",
  PREKOREDA: "↕",
  OBRNUTA: "↑",
  NAJAVA: "N",
  RUCNA: "R",
  DOJAVA: "D",
  DVOSTRUKA: "⇅",
  UKRSTENA: "⇄",
  OBAVEZNA: "O",
  MAKSIMALNA: "M",
};

export const COLUMN_NAMES: Record<ColumnType, string> = {
  REDOVNA: "Redovna",
  PREKOREDA: "Preko reda",
  OBRNUTA: "Obrnuta",
  NAJAVA: "Najava",
  RUCNA: "Ručna",
  DOJAVA: "Dirigovana",
  DVOSTRUKA: "Dvostruka",
  UKRSTENA: "Ukrštena",
  OBAVEZNA: "Obavezna",
  MAKSIMALNA: "Maksimalna",
};

export const ROW_LABELS: Record<FillableRowKey | "SUM_1_6" | "RAZLIKA" | "SUM_COMBINATIONS" | "UKUPNO", string> = {
  ROW_1: "1",
  ROW_2: "2",
  ROW_3: "3",
  ROW_4: "4",
  ROW_5: "5",
  ROW_6: "6",
  SUM_1_6: "Σ",
  MAXIMUM: "MAKS",
  MINIMUM: "MIN",
  RAZLIKA: "Σ",
  KENTA: "KENTA",
  TRILING: "TRILING",
  FUL: "FUL",
  POKER: "POKER",
  JAMB: "JAMB",
  SUM_COMBINATIONS: "Σ",
  UKUPNO: "UKUPNO",
};

export type ScorecardRowKey =
  | FillableRowKey
  | "SUM_1_6"
  | "RAZLIKA"
  | "SUM_COMBINATIONS"
  | "UKUPNO";

export const SCORECARD_ROWS: ScorecardRowKey[] = [
  "ROW_1",
  "ROW_2",
  "ROW_3",
  "ROW_4",
  "ROW_5",
  "ROW_6",
  "SUM_1_6",
  "MAXIMUM",
  "MINIMUM",
  "RAZLIKA",
  "KENTA",
  "TRILING",
  "FUL",
  "POKER",
  "JAMB",
  "SUM_COMBINATIONS",
  "UKUPNO",
];

export { COLUMN_ORDER };

export const GAME_STATUS_LABELS: Record<string, string> = {
  LOBBY: "Čekaonica",
  IN_PROGRESS: "U toku",
  FINISHED: "Završeno",
  CANCELLED: "Otkazano",
};

export const DICE_MODE_LABELS: Record<string, string> = {
  VIRTUAL: "Virtuelne kockice",
  PHYSICAL: "Fizičke kockice",
};

export const MATCH_RESULT_SHORT = {
  win: "P",
  loss: "I",
  draw: "N",
} as const;

export const LEAGUE_ROLE_LABELS: Record<string, string> = {
  OWNER: "Vlasnik",
  ADMIN: "Administrator",
  MEMBER: "Član",
};

export const COMBO_LABELS: Record<string, string> = {
  KENTA: "Kenta",
  TRILING: "Triling",
  FUL: "Ful",
  POKER: "Poker",
  JAMB: "Jamb",
};

export function gameStatusLabel(status: string): string {
  return GAME_STATUS_LABELS[status] ?? status;
}

export function diceModeLabel(mode: string): string {
  return DICE_MODE_LABELS[mode] ?? mode;
}

export function leagueRoleLabel(role: string): string {
  return LEAGUE_ROLE_LABELS[role] ?? role;
}

export function comboLabel(key: string): string {
  return COMBO_LABELS[key] ?? key;
}
