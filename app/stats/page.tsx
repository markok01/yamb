"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatCard } from "@/components/ui/stat-card";
import { useUserStats } from "@/hooks/use-game-queries";
import { comboLabel } from "@/lib/ui/labels";
import { useSessionStore } from "@/stores/session-store";

const chartGrid = "color-mix(in srgb, var(--y-border) 80%, transparent)";
const chartText = "#8a7f72";
const chartSuccess = "#b8956a";
const chartMuted = "#c4b5a8";

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

  const comboChart = combinations.map((c) => ({
    name: comboLabel(c.combination),
    uspeh: c.countSuccess,
    neuspeh: c.countFailed,
  }));

  const scoreChart = recentGames
    .filter((g) => g.finalScore != null)
    .reverse()
    .map((g, i) => ({
      partija: `#${i + 1}`,
      skor: g.finalScore,
    }));

  return (
    <PageShell title="Statistika" subtitle="Detaljni pregled učinka" maxWidth="4xl">
      {isLoading && <p className="text-[var(--y-text-muted)]">Učitavanje...</p>}

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Partije" value={stats.gamesPlayed} accent="secondary" />
          <StatCard label="Pobede" value={stats.gamesWon} accent="primary" />
          <StatCard label="% pobeda" value={`${data?.winRate ?? 0}%`} />
          <StatCard label="Prosek" value={stats.averageScore} accent="warm" />
          <StatCard label="Najbolji" value={stats.bestScore ?? "—"} accent="primary" />
        </div>
      )}

      {comboChart.length > 0 && (
        <GlassPanel className="mb-6">
          <h2 className="mb-4 font-bold text-[var(--y-text)]">Kombinacije</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={comboChart}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: chartText, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: chartText, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--y-surface-elevated)",
                  border: "1px solid var(--y-border)",
                  borderRadius: 12,
                  color: "var(--y-text)",
                }}
              />
              <Bar dataKey="uspeh" fill={chartSuccess} name="Uspeh" radius={[4, 4, 0, 0]} />
              <Bar dataKey="neuspeh" fill={chartMuted} name="Neuspeh" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>
      )}

      {scoreChart.length > 0 && (
        <GlassPanel className="mb-6">
          <h2 className="mb-4 font-bold text-[var(--y-text)]">Trend skorova</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={scoreChart}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
              <XAxis dataKey="partija" tick={{ fill: chartText, fontSize: 12 }} />
              <YAxis tick={{ fill: chartText, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--y-surface-elevated)",
                  border: "1px solid var(--y-border)",
                  borderRadius: 12,
                  color: "var(--y-text)",
                }}
              />
              <Line
                type="monotone"
                dataKey="skor"
                stroke={chartSuccess}
                strokeWidth={2}
                dot={{ fill: chartSuccess }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassPanel>
      )}

      {recentGames.length > 0 && (
        <GlassPanel>
          <h2 className="mb-4 font-bold text-[var(--y-text)]">Poslednje partije</h2>
          <ul className="divide-y divide-[var(--y-border)]">
            {recentGames.map((g) => (
              <li
                key={g.gameId}
                className="flex items-center justify-between py-3 text-sm"
              >
                <Link
                  href={`/history/${g.gameId}`}
                  className="font-mono font-bold text-[var(--y-text)] transition hover:text-[var(--y-accent)]"
                >
                  {g.roomCode}
                </Link>
                <span className="tabular-nums y-accent-text">
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
