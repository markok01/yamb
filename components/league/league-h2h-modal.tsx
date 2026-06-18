"use client";

import type { LeagueStanding } from "@/lib/api/types";
import {
  useLeagueHeadToHead,
} from "@/hooks/use-user-queries";
import { Button } from "@/components/ui/button";

export function LeagueHeadToHeadModal({
  leagueId,
  userId,
  opponent,
  onClose,
}: {
  leagueId: string;
  userId: string;
  opponent: LeagueStanding;
  onClose: () => void;
}) {
  const { data, isLoading } = useLeagueHeadToHead(
    leagueId,
    userId,
    opponent.userId,
    true
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--y-border)] bg-[var(--y-surface-elevated)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--y-text)]">Međusobni skor</h3>
        <p className="mt-1 text-sm text-[var(--y-text-muted)]">protiv {opponent.displayName}</p>

        {isLoading && (
          <p className="mt-6 text-sm text-[var(--y-text-muted)]">Učitavanje...</p>
        )}

        {data && (
          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <StatBlock label="Mečevi" value={data.matches} />
            <StatBlock label="Pobede (ti)" value={data.userA.wins} />
            <StatBlock label="Porazi" value={data.userA.losses} />
            <StatBlock label="Nerešeno" value={data.userA.draws} />
            <StatBlock label="Prosek" value={data.userA.averageScore} />
            <StatBlock label="Najbolji" value={data.userA.bestScore} />
            <StatBlock label="Najveća pobeda" value={data.userA.biggestWin} />
            <StatBlock label="Pobede (protivnik)" value={data.userB.wins} />
          </div>
        )}

        <Button variant="secondary" className="mt-6 w-full" onClick={onClose}>
          Zatvori
        </Button>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--y-surface-hover)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--y-text-muted)]">
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums text-[var(--y-text)]">{value}</p>
    </div>
  );
}
