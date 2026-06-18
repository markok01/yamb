import type { ColumnType } from "@/lib/yamb/types";
import type { ScorecardInteractionContext } from "@/lib/ui/cell-feedback";

export interface InlineScoreOptions {
  isFilled?: boolean;
}

/** Polja gde korisnik ručno unosi broj direktno u ćeliju */
export function needsInlineScoreEntry(
  columnType: ColumnType,
  ctx: ScorecardInteractionContext,
  options?: InlineScoreOptions
): boolean {
  if (options?.isFilled) {
    return !!ctx.allowCorrection;
  }

  if (ctx.najavaMode && columnType === "NAJAVA") return false;

  if (ctx.isPhysical) {
    return ctx.isMyTurn && (ctx.submitMode || !ctx.activeColumnType);
  }

  if (columnType === "RUCNA" && ctx.submitMode) return true;

  return false;
}
