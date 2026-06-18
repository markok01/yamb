import type { ColumnType, TurnState } from "@/lib/yamb/types";

/** Interna kolona za fazu bacanja pre izbora polja (samo virtuelni režim). */
export const VIRTUAL_ROLL_PLACEHOLDER: ColumnType = "PREKOREDA";

export function isVirtualRollingPhase(
  turn: TurnState | null | undefined
): boolean {
  return turn?.columnType === VIRTUAL_ROLL_PLACEHOLDER;
}
