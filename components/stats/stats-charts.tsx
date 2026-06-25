"use client";

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
import { GlassPanel } from "@/components/ui/glass-panel";
import { comboLabel } from "@/lib/ui/labels";

const chartGrid = "color-mix(in srgb, var(--y-border) 80%, transparent)";
const chartText = "var(--y-text-muted)";
const chartSuccess = "var(--y-success)";
const chartMuted = "color-mix(in srgb, var(--y-text-muted) 60%, transparent)";

interface StatsChartsProps {
  combinations: Array<{
    combination: string;
    countSuccess: number;
    countFailed: number;
  }>;
  recentGames: Array<{
    gameId: string;
    roomCode: string;
    finalScore: number | null;
    placement: number | null;
  }>;
}

export function StatsCharts({ combinations, recentGames }: StatsChartsProps) {
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
    <>
      {comboChart.length > 0 && (
        <GlassPanel className="mb-6">
          <h2 className="mb-4 text-[17px] font-semibold text-[var(--y-text)]">
            Kombinacije
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={comboChart}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: chartText, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: chartText, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--y-surface-elevated)",
                  border: "1px solid var(--y-border)",
                  borderRadius: 10,
                  color: "var(--y-text)",
                  fontSize: 13,
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
          <h2 className="mb-4 text-[17px] font-semibold text-[var(--y-text)]">
            Trend skorova
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={scoreChart}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
              <XAxis dataKey="partija" tick={{ fill: chartText, fontSize: 12 }} />
              <YAxis tick={{ fill: chartText, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--y-surface-elevated)",
                  border: "1px solid var(--y-border)",
                  borderRadius: 10,
                  color: "var(--y-text)",
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="skor"
                stroke={chartSuccess}
                strokeWidth={2}
                dot={{ fill: chartSuccess, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassPanel>
      )}
    </>
  );
}
