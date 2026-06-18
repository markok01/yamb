"use client";

import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import type { CellUiState } from "@/lib/ui/cell-feedback";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";

interface CellDetailModalProps {
  columnType: ColumnType;
  rowKey: FillableRowKey;
  state: CellUiState;
  onClose: () => void;
  onConfirm?: () => void;
  onDojavaAccept?: () => void;
  onDojavaReject?: () => void;
  isLoading?: boolean;
}

export function CellDetailModal({
  columnType,
  rowKey,
  state,
  onClose,
  onConfirm,
  onDojavaAccept,
  onDojavaReject,
  isLoading,
}: CellDetailModalProps) {
  const isAllowed = state.allowed;
  const isDojava = state.isDojavaSuggestion && state.suggestedScore !== undefined;

  return (
    <div
      className="scorecard-modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="scorecard-modal-panel w-full max-w-md rounded-2xl border p-6 shadow-xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cell-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--y-text-muted)" }}
            >
              {COLUMN_NAMES[columnType]} · {ROW_LABELS[rowKey]}
            </p>
            <h3
              id="cell-modal-title"
              className="mt-1 text-lg font-bold"
              style={{ color: "var(--y-text)" }}
            >
              {state.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition hover:opacity-70"
            style={{ color: "var(--y-text-muted)" }}
            aria-label="Zatvori"
          >
            ✕
          </button>
        </div>

        <div
          className="rounded-xl border px-4 py-3 transition-colors duration-200"
          style={{
            borderColor: isAllowed
              ? "color-mix(in srgb, var(--y-accent) 40%, transparent)"
              : "color-mix(in srgb, var(--y-danger) 40%, transparent)",
            background: isAllowed
              ? "var(--y-accent-soft)"
              : "color-mix(in srgb, var(--y-danger) 12%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{
                background: isAllowed ? "var(--y-accent)" : "var(--y-danger)",
              }}
            >
              {isAllowed ? "✓" : "✕"}
            </span>
            <p
              className="font-semibold"
              style={{ color: isAllowed ? "var(--y-accent)" : "var(--y-danger)" }}
            >
              {state.message}
            </p>
          </div>
          {state.reason && (
            <p className="mt-2 text-sm" style={{ color: "var(--y-text-muted)" }}>
              {state.reason}
            </p>
          )}
        </div>

        {state.scoreHint && (
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--y-accent-secondary)" }}
          >
            {state.scoreHint}
          </p>
        )}

        {state.suggestedScore !== undefined && !isDojava && (
          <p className="mt-2 text-sm" style={{ color: "var(--y-text-muted)" }}>
            Predlog:{" "}
            <strong style={{ color: "var(--y-text)" }}>{state.suggestedScore}</strong>{" "}
            poena
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {isDojava && onDojavaAccept && onDojavaReject && (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  onDojavaAccept();
                  onClose();
                }}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--y-accent)" }}
              >
                Prihvati ({state.suggestedScore})
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  onDojavaReject();
                  onClose();
                }}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                style={{
                  borderColor: "var(--y-border-strong)",
                  color: "var(--y-text)",
                }}
              >
                Odbij
              </button>
            </>
          )}

          {isAllowed && onConfirm && !isDojava && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--y-accent)" }}
            >
              {state.status === "najava-select" ? "Najavi polje" : "Upiši rezultat"}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:opacity-80"
            style={{
              borderColor: "var(--y-border)",
              color: "var(--y-text-muted)",
            }}
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}
