"use client";

import { useState } from "react";
import type { LeagueStanding } from "@/lib/api/types";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/ui/cn";
import { rankMedal } from "./league-utils";
import { LeagueHeadToHeadModal } from "./league-h2h-modal";

export function LeagueStandingsTab({
  leagueId,
  standings,
  currentUserId,
}: {
  leagueId: string;
  standings: LeagueStanding[];
  currentUserId: string;
}) {
  const [h2hTarget, setH2hTarget] = useState<LeagueStanding | null>(null);

  if (!standings.length) {
    return (
      <GlassPanel>
        <p className="text-sm text-[var(--y-text-muted)]">
          Nema odigranih partija — tabela će se popuniti nakon prvih mečeva.
        </p>
      </GlassPanel>
    );
  }

  return (
    <>
      <GlassPanel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--y-border)] bg-[var(--y-surface-hover)] text-left text-[10px] uppercase tracking-wider text-[var(--y-text-muted)]">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Igrač</th>
                <th className="px-4 py-3 text-center">O</th>
                <th className="px-4 py-3 text-center">P</th>
                <th className="px-4 py-3 text-center">I</th>
                <th className="px-4 py-3 text-center">N</th>
                <th className="px-4 py-3 text-center">Bodovi</th>
                <th className="px-4 py-3 text-center">Ø</th>
                <th className="px-4 py-3 text-center">Najbolji</th>
                <th className="px-4 py-3 text-center">+/−</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const medal = rankMedal(row.rank);
                const isMe = row.userId === currentUserId;
                return (
                  <tr
                    key={row.userId}
                    className={cn(
                      "border-b border-[var(--y-border)] transition hover:bg-[var(--y-surface-hover)]",
                      isMe && "y-row-highlight"
                    )}
                  >
                    <td className="px-4 py-3 font-bold tabular-nums">
                      {medal ?? row.rank}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setH2hTarget(row)}
                        className="flex items-center gap-2 text-left font-semibold hover:text-[var(--y-accent)]"
                      >
                        {row.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.avatarUrl}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--y-surface-hover)] text-xs">
                            {row.displayName.charAt(0)}
                          </span>
                        )}
                        {row.displayName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{row.gamesPlayed}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-green-400">{row.wins}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-red-400">{row.losses}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{row.draws}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold">{row.totalPoints}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{row.averageScore}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{row.bestScore}</td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {h2hTarget && (
        <LeagueHeadToHeadModal
          leagueId={leagueId}
          userId={currentUserId}
          opponent={h2hTarget}
          onClose={() => setH2hTarget(null)}
        />
      )}
    </>
  );
}
