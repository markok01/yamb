"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatCard } from "@/components/ui/stat-card";
import { useUserStats } from "@/hooks/use-game-queries";
import { useSessionStore } from "@/stores/session-store";

const StatsCharts = dynamic(
  () =>
    import("@/components/stats/stats-charts").then((m) => m.StatsCharts),
  {
    ssr: false,
    loading: () => (
      <GlassPanel className="mb-6">
        <p className="text-sm text-[var(--y-text-muted)]">Učitavanje grafikona…</p>
      </GlassPanel>
    ),
  }
);

export default function StatsPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const { data, isLoading } = useUserStats(user?.id ?? null);

  useEffect(() => {
    if (!user) router.replace("/lobby");
  }, [user, router]);

  if (!user) return null;

  const stats = data?.stats;
  const combinations = data?.combinations ?? [];
  const recentGames = data?.recentGames ?? [];

  return (
    <PageShell title="Statistika" subtitle="Detaljni pregled učinka" maxWidth="4xl">
      {isLoading && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-[var(--y-surface-hover)]"
            />
          ))}
        </div>
      )}

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Partije" value={stats.gamesPlayed} accent="secondary" />
          <StatCard label="Pobede" value={stats.gamesWon} accent="primary" />
          <StatCard label="% pobeda" value={`${data?.winRate ?? 0}%`} />
          <StatCard label="Prosek" value={stats.averageScore} accent="warm" />
          <StatCard label="Najbolji" value={stats.bestScore ?? "—"} accent="primary" />
        </div>
      )}

      {!isLoading && (combinations.length > 0 || recentGames.length > 0) && (
        <StatsCharts combinations={combinations} recentGames={recentGames} />
      )}

      {recentGames.length > 0 && (
        <GlassPanel>
          <h2 className="mb-4 text-[17px] font-semibold text-[var(--y-text)]">
            Poslednje partije
          </h2>
          <ul className="divide-y divide-[var(--y-border)]">
            {recentGames.map((g) => (
              <li
                key={g.gameId}
                className="flex items-center justify-between py-3 text-sm"
              >
                <Link
                  href={`/history/${g.gameId}`}
                  className="font-mono font-medium text-[var(--y-text)] transition hover:text-[var(--y-accent)]"
                >
                  {g.roomCode}
                </Link>
                <span className="tabular-nums text-[var(--y-accent)]">
                  {g.finalScore ?? "—"} · #{g.placement ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      {!isLoading && stats?.gamesPlayed === 0 && (
        <GlassPanel>
          <p className="text-center text-[var(--y-text-muted)]">
            Nema odigranih partija.{" "}
            <Link href="/lobby" className="y-link">
              Kreiraj partiju
            </Link>
          </p>
        </GlassPanel>
      )}
    </PageShell>
  );
}
