"use client";

import { useState } from "react";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import type { PlayerScorecard } from "@/lib/api/types";
import type { ScorecardInteractionContext } from "@/lib/ui/cell-feedback";
import { getCellUiState } from "@/lib/ui/cell-feedback";
import {
  COLUMN_LABELS,
  COLUMN_NAMES,
  ROW_LABELS,
  SCORECARD_ROWS,
  type ScorecardRowKey,
} from "@/lib/ui/labels";
import { FILLABLE_ROWS_TOP_TO_BOTTOM } from "@/lib/yamb/constants";
import { CellInlineInput } from "./cell-inline-input";

function isFillableRow(row: ScorecardRowKey): row is FillableRowKey {
  return FILLABLE_ROWS_TOP_TO_BOTTOM.includes(row as FillableRowKey);
}

function getCellValue(
  scorecard: PlayerScorecard,
  columnType: ColumnType,
  row: ScorecardRowKey
): string {
  const column = scorecard.columns.find((c) => c.columnType === columnType);
  if (!column) return "";
  if (isFillableRow(row)) {
    const entry = column.entries[row];
    return entry !== undefined ? String(entry.score) : "";
  }
  if (row === "SUM_1_6") {
    const { sum1to6, sum1to6Bonus } = column.totals;
    if (sum1to6 === 0 && !Object.keys(column.entries).some((k) => k.startsWith("ROW_")))
      return "";
    return sum1to6Bonus > 0 ? `${sum1to6}+${sum1to6Bonus}` : String(sum1to6);
  }
  if (row === "RAZLIKA") return column.totals.razlika ? String(column.totals.razlika) : "";
  if (row === "SUM_COMBINATIONS")
    return column.totals.sumCombinations ? String(column.totals.sumCombinations) : "";
  if (row === "UKUPNO") return column.totals.columnTotal ? String(column.totals.columnTotal) : "";
  return "";
}

interface ScorecardMobileProps {
  scorecard: PlayerScorecard;
  ctx: ScorecardInteractionContext;
  activeColumnType: ColumnType | null;
  onCellClick: (
    columnType: ColumnType,
    rowKey: FillableRowKey,
    isCorrection?: boolean
  ) => void;
  turn: ScorecardInteractionContext["turn"];
  editingCell?: {
    columnType: ColumnType;
    rowKey: FillableRowKey;
  } | null;
  onInlineSubmit?: (
    columnType: ColumnType,
    rowKey: FillableRowKey,
    value: string
  ) => void;
  onInlineCancel?: () => void;
  inlineSubmitting?: boolean;
  isLoading?: boolean;
}

export function ScorecardMobile({
  scorecard,
  ctx,
  activeColumnType,
  onCellClick,
  turn,
  editingCell,
  onInlineSubmit,
  onInlineCancel,
  inlineSubmitting = false,
  isLoading,
}: ScorecardMobileProps) {
  const [openCol, setOpenCol] = useState<ColumnType>(
    activeColumnType ?? scorecard.columns[0]?.columnType ?? "REDOVNA"
  );

  const column = scorecard.columns.find((c) => c.columnType === openCol);
  if (!column) return null;

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-1 overflow-x-auto pb-2">
        {scorecard.columns.map((col) => (
          <button
            key={col.columnType}
            type="button"
            onClick={() => setOpenCol(col.columnType)}
            className={[
              "shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition-all duration-200",
              openCol === col.columnType
                ? "scorecard-mobile-tabs-active"
                : "scorecard-mobile-tabs-inactive hover:opacity-80",
              activeColumnType === col.columnType && ctx.showPlayHints !== false
                ? "scorecard-cell-pulse"
                : "",
            ].join(" ")}
            title={COLUMN_NAMES[col.columnType]}
          >
            {COLUMN_LABELS[col.columnType]}
          </button>
        ))}
      </div>

      <div className="scorecard-mobile-panel rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--sc-text)" }}>
          {COLUMN_NAMES[openCol]}
        </h3>
        <ul className="space-y-1">
          {SCORECARD_ROWS.map((row) => {
            const value = getCellValue(scorecard, openCol, row);
            if (!isFillableRow(row)) {
              if (!value) return null;
              return (
                <li
                  key={row}
                  className="flex justify-between rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--y-surface-hover)" }}
                >
                  <span style={{ color: "var(--sc-text-muted)" }}>{ROW_LABELS[row]}</span>
                  <span className="scorecard-value-filled font-bold">{value}</span>
                </li>
              );
            }

            const ui = getCellUiState(column, scorecard.columns, row, ctx);
            const isNajavaLocked =
              openCol === "NAJAVA" && turn?.najavaRowKey === row && value;
            const isEditing =
              editingCell?.columnType === openCol && editingCell.rowKey === row;

            return (
              <li key={row}>
                {isEditing && onInlineSubmit && onInlineCancel ? (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "var(--sc-accent-soft)" }}
                  >
                    <span className="flex-1 text-sm">{ROW_LABELS[row]}</span>
                    <CellInlineInput
                      onSubmit={(value) => onInlineSubmit(openCol, row, value)}
                      onCancel={onInlineCancel}
                      disabled={inlineSubmitting}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      if (!ui.allowed) return;
                      if (!onInlineSubmit) return;
                      e.preventDefault();
                    }}
                    onClick={() => {
                      if (!ui.allowed) return;
                      onCellClick(openCol, row);
                    }}
                    disabled={!ui.allowed}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                      ui.allowed && ctx.showPlayHints !== false
                        ? "scorecard-cell-pulse"
                        : "",
                    ].join(" ")}
                    style={{
                      background: ui.allowed
                        ? "var(--sc-accent-soft)"
                        : value
                          ? "var(--y-surface-hover)"
                          : "var(--y-surface)",
                      color: ui.allowed ? "var(--sc-accent)" : "var(--sc-text)",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {ROW_LABELS[row]}
                      {isNajavaLocked && <span className="text-xs">🔒</span>}
                    </span>
                    <span className="font-bold tabular-nums">
                      {value || (ui.allowed ? "·" : "—")}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <div
          className="mt-3 border-t pt-3 text-center"
          style={{ borderColor: "var(--sc-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--sc-text-muted)" }}>
            Ukupno kolona
          </span>
          <p className="scorecard-final-glow text-xl font-bold">
            {column.totals.columnTotal || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
