import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { notifyGameUpdate } from "@/server/lib/game-events";
import type { ScoreEntryRow } from "@/server/db/schema";

const COMBO_ROWS = ["KENTA", "TRILING", "FUL", "POKER", "JAMB"] as const;

export async function bumpGameStateVersion(gameId: string): Promise<number> {
  const db = getDb();
  await db
    .update(schema.games)
    .set({ stateVersion: sql`${schema.games.stateVersion} + 1` })
    .where(eq(schema.games.id, gameId));

  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, gameId),
    columns: { stateVersion: true },
  });

  const version = game?.stateVersion ?? 0;
  notifyGameUpdate(gameId, version);
  return version;
}

async function ensurePlayerStats(userId: string) {
  const db = getDb();
  const existing = await db.query.playerStats.findFirst({
    where: eq(schema.playerStats.userId, userId),
  });
  if (!existing) {
    await db.insert(schema.playerStats).values({ userId });
  }
}

async function ensureComboStats(userId: string) {
  const db = getDb();
  for (const combo of COMBO_ROWS) {
    const existing = await db.query.playerCombinationStats.findFirst({
      where: and(
        eq(schema.playerCombinationStats.userId, userId),
        eq(schema.playerCombinationStats.combination, combo)
      ),
    });
    if (!existing) {
      await db.insert(schema.playerCombinationStats).values({
        userId,
        combination: combo,
      });
    }
  }
}

function comboDeltas(entries: ScoreEntryRow[]) {
  const deltas: Record<string, { success: number; failed: number }> = {};
  for (const combo of COMBO_ROWS) {
    deltas[combo] = { success: 0, failed: 0 };
  }
  for (const e of entries) {
    if (!COMBO_ROWS.includes(e.rowKey as (typeof COMBO_ROWS)[number])) continue;
    if (e.score > 0) deltas[e.rowKey].success++;
    else deltas[e.rowKey].failed++;
  }
  return deltas;
}

export async function recordGameStats(
  winnerUserId: string | null,
  playerResults: Array<{
    userId: string;
    finalScore: number;
    scoreRows: ScoreEntryRow[];
  }>
) {
  const db = getDb();

  for (const p of playerResults) {
    await ensurePlayerStats(p.userId);
    await ensureComboStats(p.userId);

    const stats = await db.query.playerStats.findFirst({
      where: eq(schema.playerStats.userId, p.userId),
    });

    const gamesPlayed = (stats?.gamesPlayed ?? 0) + 1;
    const gamesWon =
      (stats?.gamesWon ?? 0) + (p.userId === winnerUserId ? 1 : 0);
    const gamesLost =
      (stats?.gamesLost ?? 0) +
      (winnerUserId && p.userId !== winnerUserId ? 1 : 0);
    const totalScore = (stats?.totalScore ?? 0) + p.finalScore;
    const averageScore = Math.round(totalScore / gamesPlayed);
    const bestScore =
      stats?.bestScore != null
        ? Math.max(stats.bestScore, p.finalScore)
        : p.finalScore;
    const worstScore =
      stats?.worstScore != null
        ? Math.min(stats.worstScore, p.finalScore)
        : p.finalScore;

    await db
      .update(schema.playerStats)
      .set({
        gamesPlayed,
        gamesWon,
        gamesLost,
        totalScore,
        averageScore,
        bestScore,
        worstScore,
        updatedAt: new Date(),
      })
      .where(eq(schema.playerStats.userId, p.userId));

    const deltas = comboDeltas(p.scoreRows);
    for (const combo of COMBO_ROWS) {
      const row = await db.query.playerCombinationStats.findFirst({
        where: and(
          eq(schema.playerCombinationStats.userId, p.userId),
          eq(schema.playerCombinationStats.combination, combo)
        ),
      });
      if (row) {
        await db
          .update(schema.playerCombinationStats)
          .set({
            countSuccess: row.countSuccess + deltas[combo].success,
            countFailed: row.countFailed + deltas[combo].failed,
          })
          .where(
            and(
              eq(schema.playerCombinationStats.userId, p.userId),
              eq(schema.playerCombinationStats.combination, combo)
            )
          );
      }
    }
  }
}

export async function getUserStats(userId: string) {
  const db = getDb();
  await ensurePlayerStats(userId);

  const stats = await db.query.playerStats.findFirst({
    where: eq(schema.playerStats.userId, userId),
  });

  const combinations = await db
    .select()
    .from(schema.playerCombinationStats)
    .where(eq(schema.playerCombinationStats.userId, userId));

  const recentGames = await db
    .select({
      game: schema.games,
      player: schema.gamePlayers,
    })
    .from(schema.gamePlayers)
    .innerJoin(schema.games, eq(schema.gamePlayers.gameId, schema.games.id))
    .where(
      and(
        eq(schema.gamePlayers.userId, userId),
        eq(schema.games.status, "FINISHED")
      )
    )
    .orderBy(desc(schema.games.finishedAt))
    .limit(20);

  return {
    stats: stats ?? {
      userId,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalScore: 0,
      averageScore: 0,
      bestScore: null,
      worstScore: null,
      updatedAt: new Date(),
    },
    winRate:
      stats && stats.gamesPlayed > 0
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
        : 0,
    combinations,
    jambCombinationsTotal: combinations.reduce(
      (sum, c) => sum + c.countSuccess,
      0
    ),
    recentGames: recentGames.map((r) => ({
      gameId: r.game.id,
      roomCode: r.game.roomCode,
      diceMode: r.game.diceMode,
      finalScore: r.player.finalScore,
      placement: r.player.placement,
      finishedAt: r.game.finishedAt,
    })),
  };
}
