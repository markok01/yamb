"use client";

import type { LeaderboardEntry } from "@/lib/api/types";
import { AnimatedScore } from "@/components/ui/animated-score";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/ui/cn";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  compact?: boolean;
}

export function Leaderboard({ entries, currentUserId, compact }: LeaderboardProps) {
  if (entries.length === 0) return null;

  return (
    <GlassPanel padding="sm" glow="accent">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
        Rang lista
      </h3>
      <ol className={cn("space-y-2", compact && "space-y-1")}>
        {entries.map((entry) => {
          const isMe = entry.userId === currentUserId;
          return (
            <li
              key={entry.gamePlayerId}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-200",
                isMe ? "y-row-highlight" : "bg-[var(--y-surface-hover)]"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    entry.placement === 1
                      ? "text-[var(--y-warning)]"
                      : "bg-[var(--y-surface)] text-[var(--y-text-muted)]"
                  )}
                  style={
                    entry.placement === 1
                      ? { background: "color-mix(in srgb, var(--y-warning) 18%, transparent)" }
                      : undefined
                  }
                >
                  {entry.placement}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    isMe ? "y-accent-text" : "text-[var(--y-text)]"
                  )}
                >
                  {entry.displayName}
                </span>
              </span>
              <AnimatedScore
                value={entry.finalScore}
                className="font-bold text-[var(--y-text)]"
              />
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}
