"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { useGameHistoryList } from "@/hooks/use-user-queries";
import { useSessionStore } from "@/stores/session-store";
import { diceModeLabel } from "@/lib/ui/labels";

const RESULT_LABELS = { win: "Pobeda", loss: "Poraz", draw: "Nerešeno" } as const;

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const { data, isLoading } = useGameHistoryList(user?.id ?? null);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const games = data?.games ?? [];

  const opponents = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      for (const o of g.opponents) set.add(o.displayName);
    }
    return [...set].sort();
  }, [games]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return games;
    const q = filter.toLowerCase();
    return games.filter(
      (g) =>
        g.roomCode.toLowerCase().includes(q) ||
        g.opponents.some((o) => o.displayName.toLowerCase().includes(q))
    );
  }, [games, filter]);

  const stats = useMemo(() => {
    const wins = games.filter((g) => g.result === "win").length;
    const losses = games.filter((g) => g.result === "loss").length;
    const draws = games.filter((g) => g.result === "draw").length;
    return { wins, losses, draws, total: games.length };
  }, [games]);

  if (!user) return null;

  return (
    <PageShell
      title="Istorija"
      subtitle="Sve odigrane partije i međusobni rezultati"
      maxWidth="4xl"
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Partije" value={stats.total} accent="secondary" />
        <StatCard label="Pobede" value={stats.wins} accent="primary" />
        <StatCard label="Porazi" value={stats.losses} accent="warm" />
        <StatCard label="Nerešeno" value={stats.draws} />
      </div>

      <GlassPanel className="mb-6">
        <Input
          label="Filter po protivniku ili kodu sobe"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Marko, ABC123..."
          list="opponents-list"
        />
        <datalist id="opponents-list">
          {opponents.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </GlassPanel>

      {isLoading && (
        <p className="text-[var(--y-text-muted)]">Učitavanje...</p>
      )}

      {!isLoading && !filtered.length && (
        <GlassPanel>
          <p className="text-center text-[var(--y-text-muted)]">
            Nema partija za prikaz.
          </p>
        </GlassPanel>
      )}

      <div className="space-y-3">
        {filtered.map((game) => {
          const isOpen = expanded === game.gameId;
          return (
            <GlassPanel
              key={game.gameId}
              padding="sm"
              className="transition-all duration-200 hover:border-[color-mix(in_srgb,var(--y-accent)_30%,transparent)]"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() =>
                  setExpanded(isOpen ? null : game.gameId)
                }
              >
                <div>
                  <span className="font-mono text-lg font-bold text-[var(--y-text)]">
                    {game.roomCode}
                  </span>
                  <p className="mt-1 text-xs text-[var(--y-text-muted)]">
                    {formatDate(game.finishedAt)} · {diceModeLabel(game.diceMode)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      game.result === "win"
                        ? "success"
                        : game.result === "loss"
                          ? "danger"
                          : "default"
                    }
                  >
                    {RESULT_LABELS[game.result]}
                  </Badge>
                  <p className="mt-2 text-2xl font-black tabular-nums y-accent-text">
                    {game.myScore ?? "—"}
                  </p>
                </div>
              </button>

              {isOpen && (
                <div className="mt-4 border-t border-[var(--y-border)] pt-4 y-page-enter">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
                    Igrači
                  </p>
                  <ul className="mb-4 space-y-1">
                    {game.players.map((p) => (
                      <li
                        key={p.userId}
                        className="flex justify-between text-sm text-[var(--y-text-muted)]"
                      >
                        <span>{p.displayName}</span>
                        <span className="tabular-nums">{p.finalScore ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/history/${game.gameId}`}
                    className="y-link text-sm font-medium"
                  >
                    Detalj partije →
                  </Link>
                </div>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </PageShell>
  );
}
