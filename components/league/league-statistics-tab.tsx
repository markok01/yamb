"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { LeagueStatsResponse } from "@/lib/api/types";
import { GlassPanel } from "@/components/ui/glass-panel";

import { comboLabel } from "@/lib/ui/labels";

export function LeagueStatisticsTab({
  stats,
  isLoading,
}: {
  stats?: LeagueStatsResponse;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <GlassPanel>
        <p className="text-sm text-[var(--y-text-muted)]">Učitavanje statistike...</p>
      </GlassPanel>
    );
  }

  if (!stats) return null;

  const comboData = Object.entries(stats.comboCounts).map(([key, value]) => ({
    name: comboLabel(key),
    count: value,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--y-text-muted)]">
        Statistika ispod važi samo za partije u ovoj ligi i ne ulazi u globalnu
        statistiku na profilu.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ukupno mečeva" value={stats.totalMatches} />
        <StatCard label="Prosečan rezultat" value={stats.averageScore} />
        <StatCard label="Rekord lige" value={stats.highestScoreEver} />
        <StatCard
          label="Najviše pobeda"
          value={stats.mostWins?.displayName ?? "—"}
          sub={
            stats.mostWins ? `${stats.mostWins.wins} pobeda` : undefined
          }
        />
      </div>

      {stats.scoreTimeline.length > 0 && (
        <GlassPanel>
          <h3 className="mb-4 text-sm font-semibold text-[var(--y-text)]">
            Rezultati kroz vreme
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.scoreTimeline}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="averageScore"
                  stroke="var(--y-accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      )}

      {comboData.some((c) => c.count > 0) && (
        <GlassPanel>
          <h3 className="mb-4 text-sm font-semibold text-[var(--y-text)]">
            Kombinacije u ligi
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comboData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--y-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      )}

      {stats.playerForm.length > 0 && (
        <GlassPanel padding="sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--y-text)]">
            Forma igrača (poslednji mečevi)
          </h3>
          <ul className="space-y-2">
            {stats.playerForm.map((p) => (
              <li
                key={p.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--y-surface-hover)] px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.displayName}</span>
                <span className="font-mono text-xs tabular-nums text-[var(--y-text-muted)]">
                  {p.recentScores.join(" · ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <GlassPanel padding="sm">
      <p className="text-[10px] uppercase tracking-wider text-[var(--y-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[var(--y-text)]">
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--y-text-muted)]">{sub}</p>}
    </GlassPanel>
  );
}
