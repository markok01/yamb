"use client";

import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/ui/glass-panel";
import { COLUMN_NAMES, diceModeLabel, gameStatusLabel } from "@/lib/ui/labels";
import type { ColumnType } from "@/lib/yamb/types";

interface GameStatusBarProps {
  roomCode: string;
  status: string;
  diceMode: string;
  currentPlayer?: string | null;
  isMyTurn?: boolean;
  activeColumn?: ColumnType | null;
  turnPhaseLabel?: string | null;
}

export function GameStatusBar({
  roomCode,
  status,
  diceMode,
  currentPlayer,
  isMyTurn,
  activeColumn,
  turnPhaseLabel,
}: GameStatusBarProps) {
  const statusVariant =
    status === "IN_PROGRESS"
      ? "success"
      : status === "FINISHED"
        ? "warning"
        : "default";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--y-border)] bg-[var(--y-surface-elevated)] px-4 py-2.5 shadow-[var(--y-shadow-sm)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[15px] font-semibold tracking-wide text-[var(--y-text)]">
          {roomCode}
        </span>
        <Badge variant={statusVariant}>{gameStatusLabel(status)}</Badge>
        <Badge variant="default">{diceModeLabel(diceMode)}</Badge>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {currentPlayer && (
          <>
            <span className="text-[var(--y-text-muted)]">Potez:</span>
            <span
              className={
                isMyTurn
                  ? "font-medium text-[var(--y-accent)]"
                  : "font-medium text-[var(--y-text)]"
              }
            >
              {currentPlayer}
              {isMyTurn && " (ti)"}
            </span>
          </>
        )}
        {activeColumn && (
          <Badge variant="success">{COLUMN_NAMES[activeColumn]}</Badge>
        )}
        {turnPhaseLabel && (
          <Badge variant="live">{turnPhaseLabel}</Badge>
        )}
      </div>
    </div>
  );
}

interface GameStatusPanelProps {
  hints: string[];
  error?: string | null;
}

export function GameStatusPanel({ hints, error }: GameStatusPanelProps) {
  return (
    <GlassPanel padding="sm" glow="accent" className="space-y-3">
      <h3 className="text-[11px] font-medium text-[var(--y-text-muted)]">
        Status igre
      </h3>
      {error && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--y-danger) 35%, transparent)",
            background: "color-mix(in srgb, var(--y-danger) 12%, transparent)",
            color: "var(--y-danger)",
          }}
        >
          {error}
        </div>
      )}
      <ul className="space-y-2">
        {hints.map((hint, i) => (
          <li
            key={i}
            className="rounded-lg bg-[var(--y-surface-hover)] px-3 py-2 text-xs leading-relaxed text-[var(--y-text-muted)]"
          >
            {hint}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
