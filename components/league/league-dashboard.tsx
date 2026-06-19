"use client";

import { useState } from "react";
import type { LeagueInfo } from "@/lib/api/types";
import {
  useJoinLeague,
  useLeagueHistory,
  useLeagueNotifications,
  useLeagueStandings,
  useLeagueStats,
} from "@/hooks/use-user-queries";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";
import { ApiClientError } from "@/lib/api/client";
import { LEAGUE_STATUS_LABEL, LEAGUE_TABS, type LeagueTab } from "./league-utils";
import { LeagueOverviewTab } from "./league-overview-tab";
import { LeagueStandingsTab } from "./league-standings-tab";
import { LeagueMembersTab } from "./league-members-tab";
import { LeagueHistoryTab } from "./league-history-tab";
import { LeagueStatisticsTab } from "./league-statistics-tab";
import { LeagueSettingsTab } from "./league-settings-tab";
import { LeaguePlayTab } from "./league-play-tab";

export function LeagueDashboard({
  league,
  userId,
}: {
  league: LeagueInfo;
  userId: string;
}) {
  const [tab, setTab] = useState<LeagueTab>("overview");
  const joinLeague = useJoinLeague(userId);
  const [joinError, setJoinError] = useState<string | null>(null);

  const { data: standingsData, isLoading: standingsLoading } =
    useLeagueStandings(league.id);
  const { data: historyData, isLoading: historyLoading } = useLeagueHistory(
    league.id
  );
  const { data: statsData, isLoading: statsLoading } = useLeagueStats(league.id);
  const { data: notifData } = useLeagueNotifications(league.id);

  const isAdmin = league.myRole === "OWNER" || league.myRole === "ADMIN";
  const isOwner = league.myRole === "OWNER";
  const isArchived = league.status === "ARCHIVED";

  const visibleTabs = LEAGUE_TABS.filter((t) => {
    if (t.id === "settings") return isAdmin;
    if (t.id === "play") return league.isMember && !isArchived;
    return true;
  });

  async function handleJoin() {
    setJoinError(null);
    try {
      await joinLeague.mutateAsync({ leagueId: league.id });
    } catch (err) {
      setJoinError(err instanceof ApiClientError ? err.message : "Greška");
    }
  }

  return (
    <div className="space-y-6">
      <GlassPanel glow="accent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {league.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={league.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="y-brand-gradient flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black">
                {league.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant={league.status === "ACTIVE" ? "success" : "default"}>
                  {LEAGUE_STATUS_LABEL[league.status]}
                </Badge>
                <Badge variant="default">Sezona {league.season}</Badge>
              </div>
              <h1 className="text-2xl font-black text-[var(--y-text)] sm:text-3xl">
                {league.name}
              </h1>
              <p className="mt-1 text-sm text-[var(--y-text-muted)]">
                {league.memberCount} članova · {league.ownerName}
              </p>
            </div>
          </div>
          {!league.isMember && league.status === "ACTIVE" && (
            <Button onClick={handleJoin} disabled={joinLeague.isPending}>
              Pridruži se
            </Button>
          )}
        </div>
        {joinError && <p className="mt-3 text-sm text-red-400">{joinError}</p>}
      </GlassPanel>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition",
              tab === t.id
                ? "y-nav-active"
                : "text-[var(--y-text-muted)] hover:bg-[var(--y-surface-hover)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <LeagueOverviewTab league={league} notifications={notifData?.notifications} />
      )}
      {tab === "play" && league.isMember && (
        <LeaguePlayTab
          league={league}
          userId={userId}
          isArchived={isArchived}
        />
      )}
      {tab === "standings" && (
        standingsLoading ? (
          <GlassPanel><p className="text-sm text-[var(--y-text-muted)]">Učitavanje...</p></GlassPanel>
        ) : (
          <LeagueStandingsTab
            leagueId={league.id}
            standings={standingsData?.standings ?? []}
            currentUserId={userId}
          />
        )
      )}
      {tab === "members" && (
        <LeagueMembersTab
          league={league}
          userId={userId}
          isAdmin={isAdmin}
          isArchived={isArchived}
          standings={standingsData?.standings}
        />
      )}
      {tab === "history" && (
        <LeagueHistoryTab
          matches={historyData?.matches ?? []}
          isLoading={historyLoading}
        />
      )}
      {tab === "statistics" && (
        <LeagueStatisticsTab stats={statsData} isLoading={statsLoading} />
      )}
      {tab === "settings" && isAdmin && (
        <LeagueSettingsTab
          league={league}
          userId={userId}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
