import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { getLeagueGameIds, getLeagueRow } from "./league-internal";

export interface StandingRowInternal {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  totalPoints: number;
  gamesPlayed: number;
  bestScore: number;
  pointDiff: number;
  headToHeadPoints: Map<string, number>;
}

function avgScore(total: number, games: number): number {
  return games > 0 ? Math.round((total / games) * 10) / 10 : 0;
}

export async function computeLeagueStandings(leagueId: string) {
  const db = getDb();
  const league = await getLeagueRow(leagueId);

  const members = await db
    .select({
      userId: schema.leagueMembers.userId,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      username: schema.users.username,
    })
    .from(schema.leagueMembers)
    .innerJoin(schema.users, eq(schema.leagueMembers.userId, schema.users.id))
    .where(eq(schema.leagueMembers.leagueId, leagueId));

  const gameIds = await getLeagueGameIds(leagueId);
  const standingsMap = new Map<string, StandingRowInternal>();

  for (const m of members) {
    standingsMap.set(m.userId, {
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      username: m.username,
      wins: 0,
      losses: 0,
      draws: 0,
      totalPoints: 0,
      gamesPlayed: 0,
      bestScore: 0,
      pointDiff: 0,
      headToHeadPoints: new Map(),
    });
  }

  if (gameIds.length > 0) {
    const players = await db
      .select({
        gameId: schema.gamePlayers.gameId,
        userId: schema.gamePlayers.userId,
        finalScore: schema.gamePlayers.finalScore,
        placement: schema.gamePlayers.placement,
      })
      .from(schema.gamePlayers)
      .where(inArray(schema.gamePlayers.gameId, gameIds));

    const byGame = new Map<string, typeof players>();
    for (const p of players) {
      const list = byGame.get(p.gameId) ?? [];
      list.push(p);
      byGame.set(p.gameId, list);
    }

    for (const gamePlayers of byGame.values()) {
      const leaguePlayers = gamePlayers.filter((gp) => standingsMap.has(gp.userId));
      if (leaguePlayers.length === 0) continue;

      const maxScore = Math.max(...leaguePlayers.map((p) => p.finalScore ?? 0));
      const winners = leaguePlayers.filter((p) => (p.finalScore ?? 0) === maxScore);

      for (const gp of leaguePlayers) {
        const row = standingsMap.get(gp.userId)!;
        const score = gp.finalScore ?? 0;
        row.gamesPlayed++;
        row.totalPoints += score;
        row.bestScore = Math.max(row.bestScore, score);

        const others = leaguePlayers.filter((p) => p.userId !== gp.userId);
        const othersAvg =
          others.length > 0
            ? others.reduce((s, p) => s + (p.finalScore ?? 0), 0) / others.length
            : 0;
        row.pointDiff += Math.round(score - othersAvg);

        if (winners.length > 1 && winners.some((w) => w.userId === gp.userId)) {
          row.draws++;
        } else if (gp.placement === 1 || (winners.length === 1 && winners[0].userId === gp.userId)) {
          row.wins++;
        } else {
          row.losses++;
        }
      }

      for (let i = 0; i < leaguePlayers.length; i++) {
        for (let j = i + 1; j < leaguePlayers.length; j++) {
          const a = leaguePlayers[i];
          const b = leaguePlayers[j];
          const rowA = standingsMap.get(a.userId)!;
          const rowB = standingsMap.get(b.userId)!;
          const scoreA = a.finalScore ?? 0;
          const scoreB = b.finalScore ?? 0;
          if (scoreA > scoreB) {
            rowA.headToHeadPoints.set(
              b.userId,
              (rowA.headToHeadPoints.get(b.userId) ?? 0) + 1
            );
          } else if (scoreB > scoreA) {
            rowB.headToHeadPoints.set(
              a.userId,
              (rowB.headToHeadPoints.get(a.userId) ?? 0) + 1
            );
          }
        }
      }
    }
  }

  const standings = [...standingsMap.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;

    const h2hA = a.headToHeadPoints.get(b.userId) ?? 0;
    const h2hB = b.headToHeadPoints.get(a.userId) ?? 0;
    if (h2hB !== h2hA) return h2hB - h2hA;

    const avgA = avgScore(a.totalPoints, a.gamesPlayed);
    const avgB = avgScore(b.totalPoints, b.gamesPlayed);
    if (avgB !== avgA) return avgB > avgA ? 1 : -1;

    return b.totalPoints - a.totalPoints;
  });

  return {
    leagueId,
    name: league.name,
    season: league.season,
    status: league.status,
    standings: standings.map((s, index) => ({
      rank: index + 1,
      userId: s.userId,
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      username: s.username,
      gamesPlayed: s.gamesPlayed,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      totalPoints: s.totalPoints,
      averageScore: avgScore(s.totalPoints, s.gamesPlayed),
      bestScore: s.bestScore,
      pointDiff: s.pointDiff,
    })),
  };
}

export async function computeMemberStats(leagueId: string, userId: string) {
  const standings = await computeLeagueStandings(leagueId);
  const row = standings.standings.find((s) => s.userId === userId);
  return row ?? null;
}
