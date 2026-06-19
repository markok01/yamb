"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DiceMode } from "@/lib/yamb/types";
import type { LeagueInfo } from "@/lib/api/types";
import {
  useCreateLeagueGame,
  useLeagueActiveGames,
} from "@/hooks/use-user-queries";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/ui/cn";

export function LeaguePlayTab({
  league,
  userId,
  isArchived,
}: {
  league: LeagueInfo;
  userId: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const createGame = useCreateLeagueGame(league.id, userId);
  const { data: activeData } = useLeagueActiveGames(league.id, userId);

  const otherMembers = useMemo(
    () => league.members.filter((m) => m.userId !== userId),
    [league.members, userId]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [diceMode, setDiceMode] = useState<DiceMode>("VIRTUAL");
  const [error, setError] = useState<string | null>(null);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === otherMembers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(otherMembers.map((m) => m.userId)));
    }
  }

  async function handleStart() {
    setError(null);
    if (selected.size === 0) {
      setError("Izaberi bar jednog igrača.");
      return;
    }
    try {
      const result = await createGame.mutateAsync({
        memberUserIds: [...selected],
        diceMode,
      });
      router.push(`/game/${result.gameId}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška pri startu");
    }
  }

  const activeGames = activeData?.games ?? [];
  const myActive = activeGames.filter((g) => g.isParticipant);

  return (
    <div className="space-y-4">
      <GlassPanel glow="accent">
        <h2 className="text-lg font-bold text-[var(--y-text)]">Nova liga partija</h2>
        <p className="mt-1 text-sm text-[var(--y-text-muted)]">
          Označi sa kim igraš — partija se odmah pokreće. Statistika ide samo u ovu
          ligu, ne u tvoju globalnu statistiku.
        </p>

        {isArchived ? (
          <p className="mt-4 text-sm text-[var(--y-warning)]">
            Arhivirana liga — nove partije nisu moguće.
          </p>
        ) : !league.isMember ? (
          <p className="mt-4 text-sm text-[var(--y-text-muted)]">
            Pridruži se ligi da možeš da igraš.
          </p>
        ) : otherMembers.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--y-text-muted)]">
            Dodaj još članova u ligu da bi mogao da biraš protivnike.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDiceMode("VIRTUAL")}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition",
                  diceMode === "VIRTUAL"
                    ? "border-[var(--y-accent)] bg-[var(--y-accent-soft)]"
                    : "border-[var(--y-border)] text-[var(--y-text-muted)]"
                )}
              >
                Virtuelne kockice
              </button>
              <button
                type="button"
                onClick={() => setDiceMode("PHYSICAL")}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition",
                  diceMode === "PHYSICAL"
                    ? "border-[var(--y-accent)] bg-[var(--y-accent-soft)]"
                    : "border-[var(--y-border)] text-[var(--y-text-muted)]"
                )}
              >
                Fizičke kockice
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
                Protivnici
              </h3>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-semibold text-[var(--y-accent)] hover:underline"
              >
                {selected.size === otherMembers.length ? "Poništi sve" : "Izaberi sve"}
              </button>
            </div>

            <ul className="mt-2 space-y-2">
              {otherMembers.map((m) => {
                const checked = selected.has(m.userId);
                return (
                  <li key={m.userId}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                        checked
                          ? "border-[var(--y-accent)] bg-[var(--y-accent-soft)]"
                          : "border-[var(--y-border)] bg-[var(--y-surface-hover)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(m.userId)}
                        className="h-4 w-4 accent-[var(--y-accent)]"
                      />
                      <span className="font-medium text-[var(--y-text)]">
                        {m.displayName}
                      </span>
                      <span className="ml-auto text-xs text-[var(--y-text-muted)]">
                        @{m.username}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-xs text-[var(--y-text-muted)]">
              Ti si uvek uključen · izabrano: {selected.size + 1} igrač
              {selected.size + 1 === 1 ? "" : "a"}
            </p>

            <Button
              fullWidth
              size="lg"
              className="mt-4"
              disabled={createGame.isPending || selected.size === 0}
              onClick={handleStart}
            >
              {createGame.isPending ? "Pokretanje..." : "Pokreni partiju"}
            </Button>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </>
        )}
      </GlassPanel>

      {myActive.length > 0 && (
        <GlassPanel padding="sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
            Aktivne liga partije
          </h3>
          <ul className="space-y-2">
            {myActive.map((g) => (
              <li key={g.gameId}>
                <Link
                  href={`/game/${g.gameId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--y-surface-hover)] px-4 py-3 transition hover:bg-[var(--y-accent-soft)]"
                >
                  <div>
                    <span className="font-mono font-bold text-[var(--y-text)]">
                      {g.roomCode}
                    </span>
                    <p className="text-xs text-[var(--y-text-muted)]">
                      {g.players.map((p) => p.displayName).join(", ")}
                    </p>
                  </div>
                  <Badge variant={g.status === "IN_PROGRESS" ? "live" : "default"}>
                    {g.status === "IN_PROGRESS" ? "U toku" : "Čekaonica"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  );
}
