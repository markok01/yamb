"use client";

import { useMemo, useState, useEffect } from "react";
import { flushSync } from "react-dom";
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
import { createEmptyDice } from "@/lib/yamb/dice";
import { needsInlineScoreEntry } from "@/lib/ui/inline-score";
import { CellInlineInput } from "./cell-inline-input";
import { ScorecardMobile } from "./scorecard-mobile";

const SECTION_END_ROWS = new Set<ScorecardRowKey>([
  "SUM_1_6",
  "RAZLIKA",
  "SUM_COMBINATIONS",
]);

const SUBTOTAL_ROWS = new Set<ScorecardRowKey>([
  "SUM_1_6",
  "RAZLIKA",
  "SUM_COMBINATIONS",
  "UKUPNO",
]);

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

  switch (row) {
    case "SUM_1_6": {
      const { sum1to6, sum1to6Bonus } = column.totals;
      if (
        sum1to6 === 0 &&
        !Object.keys(column.entries).some((k) => k.startsWith("ROW_"))
      ) {
        return "";
      }
      return sum1to6Bonus > 0 ? `${sum1to6}+${sum1to6Bonus}` : String(sum1to6);
    }
    case "RAZLIKA":
      return column.totals.razlika ? String(column.totals.razlika) : "";
    case "SUM_COMBINATIONS":
      return column.totals.sumCombinations
        ? String(column.totals.sumCombinations)
        : "";
    case "UKUPNO":
      return column.totals.columnTotal ? String(column.totals.columnTotal) : "";
    default:
      return "";
  }
}

export interface ScorecardTableProps {
  scorecard: PlayerScorecard;
  activeColumnType: ColumnType | null;
  isInteractive: boolean;
  najavaMode: boolean;
  submitMode: boolean;
  onCellClick?: (
    columnType: ColumnType,
    rowKey: FillableRowKey,
    isCorrection?: boolean
  ) => void;
  /** Ručni unos broja direktno u ćeliju */
  onInlineScoreSubmit?: (
    columnType: ColumnType,
    rowKey: FillableRowKey,
    score: number
  ) => void;
  onInlineScoreDelete?: (
    columnType: ColumnType,
    rowKey: FillableRowKey
  ) => void;
  /** Otvori inline unos nakon async startTurn (fizički / R) */
  openInlineCell?: { columnType: ColumnType; rowKey: FillableRowKey } | null;
  onInlineCancel?: () => void;
  isMyTurn?: boolean;
  isMyActiveTurn?: boolean;
  turn?: ScorecardInteractionContext["turn"];
  rollCount?: number;
  dice?: ScorecardInteractionContext["dice"];
  dojavaSuggestion?: ScorecardInteractionContext["dojavaSuggestion"];
  showDojava?: boolean;
  dojavaRejected?: boolean;
  onDojavaAccept?: () => void;
  onDojavaReject?: () => void;
  isLoading?: boolean;
  /** Blokira samo inline polje tokom slanja rezultata (ne tokom startTurn) */
  inlineSubmitting?: boolean;
  isPhysical?: boolean;
  /** Posmatrač / tuđa tabela — bez interakcije */
  readOnly?: boolean;
  /** Istakni tabelu aktivnog igrača */
  highlightActive?: boolean;
  /** Virtuelne kockice — prvo bacanje, pa izbor polja */
  virtualRollFirst?: boolean;
  /** Puna širina ekrana — sve kolone vidljive */
  fullBleed?: boolean;
  /** Ispravka postojećih unosa */
  allowCorrection?: boolean;
  /** Predlozi, pulsirajuća polja i sistemski rezultat */
  showPlayHints?: boolean;
  directedPlay?: ScorecardInteractionContext["directedPlay"];
  isDirectingMode?: boolean;
  isDirectedExecutor?: boolean;
}

export function ScorecardTable(props: ScorecardTableProps) {
  const {
    scorecard,
    activeColumnType,
    isInteractive,
    najavaMode,
    submitMode,
    onCellClick,
    onInlineScoreSubmit,
    onInlineScoreDelete,
    openInlineCell = null,
    onInlineCancel,
    isMyTurn = false,
    isMyActiveTurn = false,
    turn = null,
    rollCount = 0,
    dice = createEmptyDice(),
    dojavaSuggestion = null,
    showDojava = false,
    dojavaRejected = false,
    onDojavaAccept,
    onDojavaReject,
    isLoading,
    inlineSubmitting = false,
    isPhysical = false,
    readOnly = false,
    highlightActive = false,
    virtualRollFirst = false,
    fullBleed = false,
    allowCorrection = false,
    showPlayHints = true,
    directedPlay = null,
    isDirectingMode = false,
    isDirectedExecutor = false,
  } = props;

  const [hoveredRow, setHoveredRow] = useState<ScorecardRowKey | null>(null);
  const [hoveredCol, setHoveredCol] = useState<ColumnType | null>(null);
  const [editingCell, setEditingCell] = useState<{
    columnType: ColumnType;
    rowKey: FillableRowKey;
    initialValue: string;
    isCorrection?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!openInlineCell) return;
    setEditingCell((prev) => {
      if (
        prev?.columnType === openInlineCell.columnType &&
        prev?.rowKey === openInlineCell.rowKey
      ) {
        return prev;
      }
      const column = scorecard.columns.find(
        (c) => c.columnType === openInlineCell.columnType
      );
      const entry = column?.entries[openInlineCell.rowKey];
      return {
        columnType: openInlineCell.columnType,
        rowKey: openInlineCell.rowKey,
        initialValue: entry !== undefined ? String(entry.score) : "",
        isCorrection: entry !== undefined,
      };
    });
  }, [openInlineCell, scorecard.columns]);

  const ctx: ScorecardInteractionContext = useMemo(
    () => ({
      isMyTurn,
      isMyActiveTurn,
      activeColumnType,
      najavaMode,
      submitMode,
      turn,
      rollCount,
      dice,
      dojavaSuggestion,
      showDojava,
      dojavaRejected,
      isPhysical,
      virtualRollFirst,
      allowCorrection,
      showPlayHints,
      directedPlay,
      isDirectingMode,
      isDirectedExecutor,
    }),
    [
      isMyTurn,
      isMyActiveTurn,
      activeColumnType,
      najavaMode,
      submitMode,
      turn,
      rollCount,
      dice,
      dojavaSuggestion,
      showDojava,
      dojavaRejected,
      isPhysical,
      virtualRollFirst,
      allowCorrection,
      showPlayHints,
      directedPlay,
      isDirectingMode,
      isDirectedExecutor,
    ]
  );

  function closeInlineEdit() {
    flushSync(() => setEditingCell(null));
    onInlineCancel?.();
  }

  function submitInlineEdit(
    columnType: ColumnType,
    rowKey: FillableRowKey,
    raw: string
  ) {
    const score = parseInt(raw, 10);
    if (Number.isNaN(score) || score < 0) return;
    flushSync(() => setEditingCell(null));
    onInlineScoreSubmit?.(columnType, rowKey, score);
  }

  function deleteInlineEdit(columnType: ColumnType, rowKey: FillableRowKey) {
    flushSync(() => setEditingCell(null));
    onInlineScoreDelete?.(columnType, rowKey);
  }

  function shouldOpenInlineEditor(
    columnType: ColumnType,
    isFilled: boolean
  ): boolean {
    return needsInlineScoreEntry(columnType, ctx, { isFilled });
  }

  function openInlineEditorSync(
    columnType: ColumnType,
    rowKey: FillableRowKey,
    initialValue = "",
    isCorrection = false
  ) {
    flushSync(() => {
      setEditingCell({ columnType, rowKey, initialValue, isCorrection });
    });
  }

  function notifyParentCellClick(
    columnType: ColumnType,
    rowKey: FillableRowKey,
    isCorrection: boolean
  ) {
    if (readOnly) return;

    const col = scorecard.columns.find((c) => c.columnType === columnType);
    if (!col) return;
    const ui = getCellUiState(col, scorecard.columns, rowKey, ctx);
    if (!ui.allowed) return;

    onCellClick?.(columnType, rowKey, isCorrection);
  }

  function activateInlineCell(
    columnType: ColumnType,
    rowKey: FillableRowKey,
    initialValue = "",
    isCorrection = false
  ) {
    openInlineEditorSync(columnType, rowKey, initialValue);
    notifyParentCellClick(columnType, rowKey, isCorrection);
  }

  function handleCellClick(
    columnType: ColumnType,
    rowKey: FillableRowKey,
    isCorrection?: boolean
  ) {
    if (readOnly) return;

    const col = scorecard.columns.find((c) => c.columnType === columnType);
    if (!col) return;
    const ui = getCellUiState(col, scorecard.columns, rowKey, ctx);

    if (!ui.allowed) return;

    const cellValue = getCellValue(scorecard, columnType, rowKey);
    const isFilled = isCorrection ?? cellValue !== "";

    const alreadyEditing =
      editingCell?.columnType === columnType && editingCell.rowKey === rowKey;

    if (shouldOpenInlineEditor(columnType, isFilled) && !alreadyEditing) {
      activateInlineCell(
        columnType,
        rowKey,
        isFilled ? String(ui.suggestedScore ?? cellValue) : "",
        isFilled
      );
      return;
    }

    onCellClick?.(columnType, rowKey, isFilled);
  }

  const najavaBanner =
    najavaMode && isMyActiveTurn ? (
      <div className="scorecard-banner-najava mx-4 mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
        <span className="text-lg">📢</span>
        <span>
          <strong>Najava:</strong> Klikni polje u koloni N pre prvog bacanja
        </span>
      </div>
    ) : null;

  const dojavaBanner =
    showPlayHints && showDojava && dojavaSuggestion && !dojavaRejected ? (
      <div className="scorecard-banner-dojava mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
        <span>
          Predlog:{" "}
          <strong>
            {ROW_LABELS[dojavaSuggestion.rowKey]} = {dojavaSuggestion.score}
          </strong>
        </span>
        <div className="flex gap-2">
          {onDojavaAccept && (
            <button
              type="button"
              onClick={onDojavaAccept}
              disabled={isLoading}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--y-accent)" }}
            >
              Prihvati
            </button>
          )}
          {onDojavaReject && (
            <button
              type="button"
              onClick={onDojavaReject}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
              style={{
                borderColor: "var(--y-border-strong)",
                color: "var(--y-text)",
              }}
            >
              Odbij
            </button>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <div
        className={[
          "scorecard-premium overflow-hidden rounded-2xl border shadow-xl transition-all duration-300",
          fullBleed ? "scorecard-fullbleed flex h-full min-h-0 flex-col" : "",
          highlightActive
            ? "ring-2 ring-[color-mix(in_srgb,var(--y-accent)_40%,transparent)] y-glow-accent"
            : "",
        ].join(" ")}
      >
        {/* Header */}
        <div
          className={[
            "scorecard-header relative overflow-hidden border-b",
            fullBleed ? "shrink-0 px-3 py-2 sm:px-4" : "px-5 py-4",
          ].join(" ")}
        >
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              {!fullBleed && (
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: "var(--sc-accent)" }}
                >
                  Tabela
                </p>
              )}
              <p
                className={[
                  "truncate font-bold",
                  fullBleed ? "text-base sm:text-lg" : "text-xl",
                ].join(" ")}
                style={{ color: "var(--sc-text)" }}
              >
                {scorecard.displayName}
                {highlightActive && (
                  <span className="ml-2 text-xs font-semibold y-accent-text">
                    ● na potezu
                  </span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                style={{ color: "var(--sc-text-muted)" }}
              >
                Ukupno
              </p>
              <p
                className={[
                  "scorecard-final-glow font-black tabular-nums",
                  fullBleed ? "text-2xl sm:text-3xl" : "text-3xl",
                ].join(" ")}
              >
                {scorecard.finalScore || 0}
              </p>
            </div>
          </div>
        </div>

        {najavaBanner}
        {dojavaBanner}

        {/* Mobile column picker — samo kad nije full bleed */}
        {!fullBleed && (
          <div className="md:hidden">
            <ScorecardMobile
              scorecard={scorecard}
              ctx={ctx}
              activeColumnType={activeColumnType}
              onCellClick={handleCellClick}
              turn={turn}
              editingCell={editingCell}
              onInlineSubmit={(col, row, value) =>
                submitInlineEdit(col, row, value)
              }
              onInlineCancel={closeInlineEdit}
              onInlineDelete={(col, row) => deleteInlineEdit(col, row)}
              allowCorrection={allowCorrection}
              inlineSubmitting={inlineSubmitting}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Desktop / full-bleed table */}
        <div
          className={
            fullBleed
              ? "scorecard-table-viewport min-h-0 flex-1 overflow-auto"
              : "hidden overflow-x-auto md:block"
          }
        >
          <table
            className={[
              "scorecard-grid w-full border-collapse",
              fullBleed
                ? "scorecard-grid-full text-xs sm:text-sm"
                : "min-w-[980px] text-sm",
            ].join(" ")}
          >
            <thead className={fullBleed ? undefined : "sticky top-0 z-30"}>
              <tr>
                <th
                  className={[
                    "scorecard-row-label px-1 py-2 text-left text-[10px] font-semibold uppercase tracking-wider sm:min-w-[4.5rem] sm:px-2 sm:py-2.5 sm:text-xs",
                    fullBleed ? "" : "sticky left-0 z-40",
                  ].join(" ")}
                >
                  Red
                </th>
                {scorecard.columns.map((col) => {
                  const isActive = activeColumnType === col.columnType;
                  const isHovered = hoveredCol === col.columnType;
                  return (
                    <th
                      key={col.columnType}
                      className={[
                        "px-0.5 py-1.5 text-center transition-all duration-200 sm:px-1 sm:py-2",
                        isActive
                          ? "scorecard-th-active"
                          : isHovered
                            ? "scorecard-th-hover"
                            : "scorecard-th",
                      ].join(" ")}
                      title={COLUMN_NAMES[col.columnType]}
                      onMouseEnter={() => setHoveredCol(col.columnType)}
                      onMouseLeave={() => setHoveredCol(null)}
                    >
                      <span className="block text-base font-bold leading-none sm:text-xl lg:text-2xl">
                        {COLUMN_LABELS[col.columnType]}
                      </span>
                      <span className="mt-0.5 hidden text-[8px] font-medium uppercase tracking-wide opacity-60 sm:block lg:text-[9px]">
                        {COLUMN_NAMES[col.columnType]}
                      </span>
                    </th>
                  );
                })}
                <th
                  className="scorecard-th px-1 py-2 text-center text-sm font-bold sm:px-2 sm:text-lg"
                  style={{ color: "var(--sc-accent)" }}
                >
                  Σ
                </th>
              </tr>
            </thead>
            <tbody>
              {SCORECARD_ROWS.map((row) => {
                const isSubtotal = SUBTOTAL_ROWS.has(row);
                const isGrandTotal = row === "UKUPNO";
                const rowHovered = hoveredRow === row;

                return (
                  <tr
                    key={row}
                    className={[
                      "transition-colors duration-150",
                      SECTION_END_ROWS.has(row) ? "scorecard-section-divider" : "",
                      isGrandTotal ? "scorecard-grand-row" : "",
                      rowHovered ? "scorecard-row-hover" : "",
                    ].join(" ")}
                    onMouseEnter={() => setHoveredRow(row)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td
                      className={[
                        "scorecard-row-label px-1 py-1 text-[10px] font-semibold transition-colors duration-150 sm:px-2 sm:py-1.5 sm:text-xs",
                        fullBleed ? "" : "sticky left-0 z-20",
                        isSubtotal
                          ? "scorecard-row-label-subtotal"
                          : rowHovered
                            ? "scorecard-row-label-hover"
                            : "",
                      ].join(" ")}
                    >
                      {ROW_LABELS[row]}
                    </td>

                    {scorecard.columns.map((col) => {
                      const value = getCellValue(scorecard, col.columnType, row);
                      const isEmpty = value === "";
                      const isActiveCol = activeColumnType === col.columnType;
                      const colHovered = hoveredCol === col.columnType;
                      const crossHighlight = rowHovered || colHovered;

                      if (!isFillableRow(row)) {
                        return (
                          <td
                            key={`${col.columnType}-${row}`}
                            className={[
                              "px-2 py-2 text-center tabular-nums transition-colors duration-150",
                              isSubtotal
                                ? "scorecard-cell-subtotal"
                                : crossHighlight
                                  ? "scorecard-cell-hover"
                                  : "scorecard-cell",
                            ].join(" ")}
                          >
                            {value || null}
                          </td>
                        );
                      }

                      const ui = getCellUiState(
                        col,
                        scorecard.columns,
                        row,
                        ctx
                      );
                      const isNajavaLocked =
                        col.columnType === "NAJAVA" &&
                        turn?.najavaRowKey === row &&
                        !isEmpty;
                      const isClickableTarget = !readOnly && isInteractive && ui.allowed;
                      const showPulse =
                        showPlayHints &&
                        ui.allowed &&
                        isInteractive &&
                        isEmpty &&
                        !readOnly;
                      const showDisabled =
                        isInteractive &&
                        isMyTurn &&
                        !readOnly &&
                        isEmpty &&
                        !ui.allowed &&
                        isActiveCol;
                      const canInline = shouldOpenInlineEditor(
                        col.columnType,
                        !isEmpty
                      );
                      const isEditing =
                        editingCell?.columnType === col.columnType &&
                        editingCell.rowKey === row;
                      const inlineInitial = isEmpty
                        ? ""
                        : showPlayHints
                          ? String(ui.suggestedScore ?? value)
                          : value;

                      return (
                        <td
                          key={`${col.columnType}-${row}`}
                          className={[
                            "relative px-1 py-1 text-center tabular-nums",
                            isActiveCol && isEmpty
                              ? "scorecard-cell-active"
                              : crossHighlight
                                ? "scorecard-cell-hover"
                                : "scorecard-cell",
                            isEditing ? "scorecard-cell-active" : "",
                            isClickableTarget && !isEditing
                              ? "cursor-pointer"
                              : showDisabled
                                ? "scorecard-cell-disabled cursor-not-allowed"
                                : readOnly
                                  ? "cursor-default"
                                  : "cursor-default",
                            showPulse && !isEditing ? "scorecard-cell-pulse" : "",
                          ].join(" ")}
                          onPointerDown={(e) => {
                            if (readOnly || !ui.allowed) return;
                            if (!canInline || isEditing) return;
                            e.preventDefault();
                            e.stopPropagation();
                            activateInlineCell(
                              col.columnType,
                              row,
                              inlineInitial,
                              !isEmpty
                            );
                          }}
                          onClick={(e) => {
                            if (readOnly || !ui.allowed) return;
                            if (canInline) {
                              e.preventDefault();
                              return;
                            }
                            handleCellClick(col.columnType, row, !isEmpty);
                          }}
                          onMouseEnter={() => setHoveredCol(col.columnType)}
                          onMouseLeave={() => setHoveredCol(null)}
                        >
                          {isEditing && editingCell ? (
                            <CellInlineInput
                              key={`${col.columnType}-${row}`}
                              initialValue={editingCell.initialValue}
                              showDelete={
                                !!editingCell.isCorrection && !!allowCorrection
                              }
                              onSubmit={(raw) =>
                                submitInlineEdit(col.columnType, row, raw)
                              }
                              onDelete={() =>
                                deleteInlineEdit(col.columnType, row)
                              }
                              onCancel={closeInlineEdit}
                              disabled={inlineSubmitting}
                            />
                          ) : value ? (
                            <span className="scorecard-value-filled inline-block font-bold">
                              {value}
                            </span>
                          ) : showPulse ? (
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{
                                background: "var(--sc-accent)",
                                boxShadow: "0 0 8px var(--y-accent-glow)",
                              }}
                            />
                          ) : null}
                          {isNajavaLocked && (
                            <span
                              className="absolute right-1 top-1 text-[10px]"
                              style={{ color: "var(--y-warning)" }}
                              title="Najavljeno"
                            >
                              🔒
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td
                      className="scorecard-cell px-2 py-2 text-center tabular-nums font-semibold"
                      style={{ color: "var(--sc-text-muted)" }}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer legend */}
        <div
          className={[
            "scorecard-footer shrink-0 border-t",
            fullBleed ? "px-2 py-2 sm:px-3" : "px-4 py-3",
          ].join(" ")}
        >
          <p className="text-[9px] leading-relaxed sm:text-[10px]">
            ↓ redovna · ↕ preko reda · ↑ obrnuta · N najava · R ručna · D dirigovana · ⇅
            dvostruka · ⇄ ukrštena · O obavezna · M maksimalna
            {readOnly
              ? " — uživo prikaz (samo čitanje)"
              : " — klikni polje, unesi broj, Enter"}
          </p>
        </div>
      </div>
    </>
  );
}
