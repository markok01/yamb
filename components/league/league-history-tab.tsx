"use client";

import Link from "next/link";
import type { LeagueMatchHistoryItem } from "@/lib/api/types";
import { GlassPanel } from "@/components/ui/glass-panel";
import { formatDate, formatDuration } from "./league-utils";

export function LeagueHistoryTab({
  matches,
  isLoading,
}: {
  matches: LeagueMatchHistoryItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <GlassPanel>
        <p className="text-sm text-[var(--y-text-muted)]">Učitavanje istorije...</p>
      </GlassPanel>
    );
  }

  if (!matches.length) {
    return (
      <GlassPanel>
        <p className="text-sm text-[var(--y-text-muted)]">Još nema mečeva u ligi.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <GlassPanel key={m.gameId} padding="sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href={`/history/${m.gameId}`}
                className="font-mono text-sm font-bold y-link"
              >
                {m.roomCode}
              </Link>
              <p className="mt-1 text-xs text-[var(--y-text-muted)]">
                {formatDate(m.finishedAt)} · {formatDuration(m.durationMs)} ·{" "}
                {m.diceMode === "PHYSICAL" ? "Fizičke" : "Virtuelne"}
              </p>
              {m.winnerName && (
                <p className="mt-1 text-sm text-[var(--y-accent)]">
                  Pobednik: {m.winnerName}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {m.players
                .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
                .map((p) => (
                  <span
                    key={p.userId}
                    className="rounded-lg bg-[var(--y-surface-hover)] px-2 py-1 text-xs tabular-nums"
                  >
                    {p.displayName}: {p.finalScore ?? "—"}
                  </span>
                ))}
            </div>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
