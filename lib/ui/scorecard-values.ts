import type { PlayerScorecard } from "@/lib/api/types";
import type { ScorecardRowKey } from "@/lib/ui/labels";
import {
  hasAnyCombinationEntries,
  hasAnyNumberRowEntries,
  hasMaxMinForRazlika,
} from "@/lib/yamb/scoring";
import type { ColumnTotals, FillableRowKey, ScoreEntry } from "@/lib/yamb/types";

export function getSubtotalCellValue(
  totals: ColumnTotals,
  entries: Partial<Record<FillableRowKey, ScoreEntry>>,
  row: ScorecardRowKey
): string {
  switch (row) {
    case "SUM_1_6": {
      if (!hasAnyNumberRowEntries(entries)) return "";
      return String(totals.sum1to6 + totals.sum1to6Bonus);
    }
    case "RAZLIKA": {
      if (!hasMaxMinForRazlika(entries)) return "";
      return String(totals.razlika);
    }
    case "SUM_COMBINATIONS": {
      if (!hasAnyCombinationEntries(entries)) return "";
      return String(totals.sumCombinations);
    }
    case "UKUPNO": {
      if (Object.keys(entries).length === 0) return "";
      return String(totals.columnTotal);
    }
    default:
      return "";
  }
}

export function getScorecardRowTotal(
  scorecard: PlayerScorecard,
  row: ScorecardRowKey
): string {
  switch (row) {
    case "SUM_1_6": {
      let total = 0;
      let any = false;
      for (const col of scorecard.columns) {
        if (!hasAnyNumberRowEntries(col.entries)) continue;
        any = true;
        total += col.totals.sum1to6 + col.totals.sum1to6Bonus;
      }
      return any ? String(total) : "";
    }
    case "RAZLIKA": {
      let total = 0;
      let any = false;
      for (const col of scorecard.columns) {
        if (!hasMaxMinForRazlika(col.entries)) continue;
        any = true;
        total += col.totals.razlika;
      }
      return any ? String(total) : "";
    }
    case "SUM_COMBINATIONS": {
      let total = 0;
      let any = false;
      for (const col of scorecard.columns) {
        if (!hasAnyCombinationEntries(col.entries)) continue;
        any = true;
        total += col.totals.sumCombinations;
      }
      return any ? String(total) : "";
    }
    case "UKUPNO":
      return scorecard.finalScore > 0 || scorecard.columns.some(
        (col) => Object.keys(col.entries).length > 0
      )
        ? String(scorecard.finalScore)
        : "";
    default:
      return "";
  }
}
