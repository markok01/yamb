import { and, eq, inArray, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { getLeagueGameIds, getLeagueRow } from "./league-internal";
import { computeLeagueStandings } from "./league-standings";

const COMBO_ROWS = ["KENTA", "TRILING", "FUL", "POKER", "JAMB"] as const;

export async function computeLeagueStatistics(leagueId: string) {
  const league = await getLeagueRow(leagueId);
  const gameIds = await getLeagueGameIds(leagueId);
  const standings = await computeLeagueStandings(leagueId);
  const db = getDb();

  if (gameIds.length === 0) {
    return {
      leagueId,
      totalMatches: 0,
      averageScore: 0,
      highestScoreEver: 0,
      mostWins: null,
      comboCounts: Object.fromEntries(COMBO_ROWS.map((c) => [c, 0])),
      scoreTimeline: [] as Array<{ date: string; averageScore: number }>,
      topPlayers: standings.standings.slice(0, 5),
      playerForm: [] as Array<{ userId: string; displayName: string; recentScores: number[] }>,
    };
  }

  const players = await db
    .select({
      gameId: schema.gamePlayers.gameId,
      userId: schema.gamePlayers.userId,
      displayName: schema.users.displayName,
      finalScore: schema.gamePlayers.finalScore,
      finishedAt: schema.games.finishedAt,
    })
    .from(schema.gamePlayers)
    .innerJoin(schema.games, eq(schema.gamePlayers.gameId, schema.games.id))
    .innerJoin(schema.users, eq(schema.gamePlayers.userId, schema.users.id))
    .where(inArray(schema.gamePlayers.gameId, gameIds));

  const leagueMemberIds = new Set(
    (
      await db
        .select({ userId: schema.leagueMembers.userId })
        .from(schema.leagueMembers)
        .where(eq(schema.leagueMembers.leagueId, leagueId))
    ).map((m) => m.userId)
  );

  const memberScores = players.filter(
    (p) => leagueMemberIds.has(p.userId) && p.finalScore != null
  );
  const totalMatches = gameIds.length;
  const allScores = memberScores.map((p) => p.finalScore!);
  const averageScore =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0;
  const highestScoreEver = allScores.length > 0 ? Math.max(...allScores) : 0;
  const mostWins = standings.standings[0] ?? null;

  const gamePlayerIds = await db
    .select({ id: schema.gamePlayers.id })
    .from(schema.gamePlayers)
    .where(inArray(schema.gamePlayers.gameId, gameIds));

  const gpIds = gamePlayerIds.map((r) => r.id);
  const comboCounts: Record<string, number> = Object.fromEntries(
    COMBO_ROWS.map((c) => [c, 0])
  );

  if (gpIds.length > 0) {
    for (const combo of COMBO_ROWS) {
      const rows = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.scoreEntries)
        .where(
          and(
            inArray(schema.scoreEntries.gamePlayerId, gpIds),
            eq(schema.scoreEntries.rowKey, combo),
            gt(schema.scoreEntries.score, 0)
          )
        );
      comboCounts[combo] = Number(rows[0]?.count ?? 0);
    }
  }

  const byDate = new Map<string, number[]>();
  for (const p of memberScores) {
    if (!p.finishedAt) continue;
    const date = new Date(p.finishedAt).toISOString().slice(0, 10);
    const list = byDate.get(date) ?? [];
    list.push(p.finalScore!);
    byDate.set(date, list);
  }

  const scoreTimeline = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date,
      averageScore:
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }));

  const recentByUser = new Map<string, { name: string; scores: number[] }>();
  const sorted = [...memberScores].sort(
    (a, b) =>
      new Date(b.finishedAt ?? 0).getTime() - new Date(a.finishedAt ?? 0).getTime()
  );
  for (const p of sorted) {
    if (!recentByUser.has(p.userId)) {
      recentByUser.set(p.userId, { name: p.displayName, scores: [] });
    }
    const entry = recentByUser.get(p.userId)!;
    if (entry.scores.length < 5) entry.scores.push(p.finalScore!);
  }

  const playerForm = [...recentByUser.entries()].map(([userId, v]) => ({
    userId,
    displayName: v.name,
    recentScores: v.scores.reverse(),
  }));

  return {
    leagueId,
    leagueName: league.name,
    totalMatches,
    averageScore,
    highestScoreEver,
    mostWins,
    comboCounts,
    scoreTimeline,
    topPlayers: standings.standings.slice(0, 5),
    playerForm,
  };
}
