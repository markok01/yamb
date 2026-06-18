"use client";

import { useState } from "react";
import type { LeagueInfo } from "@/lib/api/types";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { leagueRoleLabel } from "@/lib/ui/labels";
import { formatDate } from "./league-utils";
import { useQueryClient } from "@tanstack/react-query";
import { leagueKeys } from "@/hooks/use-user-queries";

export function LeagueMembersTab({
  league,
  userId,
  isAdmin,
  isArchived,
  standings = [],
}: {
  league: LeagueInfo;
  userId: string;
  isAdmin: boolean;
  isArchived: boolean;
  standings?: Array<{
    userId: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    averageScore: number;
  }>;
}) {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function addMember() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/api/league/${league.id}/members`, {
        method: "POST",
        userId,
        body: JSON.stringify({ username }),
      });
      setUsername("");
      qc.invalidateQueries({ queryKey: leagueKeys.detail(league.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(targetUserId: string) {
    setLoading(true);
    try {
      await apiFetch(`/api/league/${league.id}/members/${targetUserId}`, {
        method: "DELETE",
        userId,
      });
      qc.invalidateQueries({ queryKey: leagueKeys.detail(league.id) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && !isArchived && (
        <GlassPanel padding="sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--y-text)]">
            Dodaj člana
          </h3>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Korisničko ime"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="min-w-[200px] flex-1"
            />
            <Button onClick={addMember} disabled={loading || !username.trim()}>
              Dodaj
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </GlassPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {league.members.map((m) => {
          const row = standings.find((s) => s.userId === m.userId);
          return (
            <GlassPanel key={m.userId} padding="sm">
              <div className="flex items-start gap-3">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--y-surface-hover)] font-bold">
                    {m.displayName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--y-text)]">{m.displayName}</p>
                  <p className="text-xs text-[var(--y-text-muted)]">@{m.username}</p>
                  <p className="mt-1 text-[10px] text-[var(--y-text-muted)]">
                    {leagueRoleLabel(m.role)} · od {formatDate(m.joinedAt)}
                  </p>
                </div>
                {isAdmin && m.role !== "OWNER" && m.userId !== userId && !isArchived && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => removeMember(m.userId)}
                    disabled={loading}
                  >
                    Ukloni
                  </Button>
                )}
              </div>
              {!row ? (
                <p className="mt-2 text-xs text-[var(--y-text-muted)]">
                  Statistika nakon prvih mečeva u ligi
                </p>
              ) : (
                <p className="mt-2 text-xs tabular-nums text-[var(--y-text-muted)]">
                  {row.gamesPlayed} mečeva · {row.wins}P / {row.losses}I · ø{" "}
                  {row.averageScore}
                </p>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
