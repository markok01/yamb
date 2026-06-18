import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { ApiError } from "@/server/lib/api-error";
import type { LeaderboardEntry } from "./state-mapper";

type GameResult = "win" | "loss" | "draw";

function resultForUser(
  userId: string,
  winnerUserId: string | null,
  myScore: number,
  opponentScore: number
): GameResult {
  if (myScore === opponentScore) return "draw";
  if (winnerUserId === userId) return "win";
  if (winnerUserId && myScore > opponentScore) return "win";
  if (winnerUserId && myScore < opponentScore) return "loss";
  return myScore > opponentScore ? "win" : "loss";
}

async function upsertOpponentPair(
  userId: string,
  opponentId: string,
  myScore: number,
  opponentScore: number
) {
  const db = getDb();
  const existing = await db.query.opponentStats.findFirst({
    where: and(
      eq(schema.opponentStats.userId, userId),
      eq(schema.opponentStats.opponentId, opponentId)
    ),
  });

  let wins = existing?.wins ?? 0;
  let losses = existing?.losses ?? 0;
  let draws = existing?.draws ?? 0;

  if (myScore > opponentScore) wins++;
  else if (myScore < opponentScore) losses++;
  else draws++;

  const payload = {
    matchesPlayed: (existing?.matchesPlayed ?? 0) + 1,
    wins,
    losses,
    draws,
    totalMyScore: (existing?.totalMyScore ?? 0) + myScore,
    totalOpponentScore: (existing?.totalOpponentScore ?? 0) + opponentScore,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(schema.opponentStats)
      .set(payload)
      .where(
        and(
          eq(schema.opponentStats.userId, userId),
          eq(schema.opponentStats.opponentId, opponentId)
        )
      );
  } else {
    await db.insert(schema.opponentStats).values({
      userId,
      opponentId,
      ...payload,
    });
  }
}

export async function recordOpponentStats(
  gameId: string,
  leaderboard: LeaderboardEntry[],
  winnerUserId: string | null
) {
  if (leaderboard.length < 2) return;

  const scoreByUser = new Map(
    leaderboard.map((e) => [e.userId, e.finalScore])
  );
  const userIds = leaderboard.map((e) => e.userId);

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const a = userIds[i];
      const b = userIds[j];
      const scoreA = scoreByUser.get(a) ?? 0;
      const scoreB = scoreByUser.get(b) ?? 0;
      await upsertOpponentPair(a, b, scoreA, scoreB);
      await upsertOpponentPair(b, a, scoreB, scoreA);
    }
  }

  void gameId;
  void winnerUserId;
}

export async function getGameHistory(
  userId: string,
  limit = 50,
  offset = 0
) {
  const db = getDb();

  const rows = await db
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
    .limit(limit)
    .offset(offset);

  const gameIds = rows.map((r) => r.game.id);
  if (gameIds.length === 0) {
    return { games: [], total: 0 };
  }

  const allPlayers = await db
    .select({
      gameId: schema.gamePlayers.gameId,
      userId: schema.gamePlayers.userId,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      finalScore: schema.gamePlayers.finalScore,
      placement: schema.gamePlayers.placement,
    })
    .from(schema.gamePlayers)
    .innerJoin(schema.users, eq(schema.gamePlayers.userId, schema.users.id))
    .where(inArray(schema.gamePlayers.gameId, gameIds));

  const playersByGame = new Map<string, typeof allPlayers>();
  for (const p of allPlayers) {
    const list = playersByGame.get(p.gameId) ?? [];
    list.push(p);
    playersByGame.set(p.gameId, list);
  }

  const games = rows.map(({ game, player }) => {
    const opponents = (playersByGame.get(game.id) ?? []).filter(
      (p) => p.userId !== userId
    );
    const myScore = player.finalScore ?? 0;
    const topOpponent = opponents[0];
    const opponentScore = topOpponent?.finalScore ?? 0;

    let result: GameResult = "loss";
    if (game.winnerUserId === userId) result = "win";
    else if (!game.winnerUserId && myScore === opponentScore) result = "draw";
    else if (player.placement === 1) result = "win";
    else if (
      opponents.every((o) => (o.finalScore ?? 0) < myScore)
    )
      result = "win";

    return {
      gameId: game.id,
      roomCode: game.roomCode,
      diceMode: game.diceMode,
      finishedAt: game.finishedAt,
      winnerUserId: game.winnerUserId,
      myScore: player.finalScore,
      myPlacement: player.placement,
      result,
      opponents: opponents.map((o) => ({
        userId: o.userId,
        displayName: o.displayName,
        avatarUrl: o.avatarUrl,
        finalScore: o.finalScore,
        placement: o.placement,
      })),
      players: (playersByGame.get(game.id) ?? []).map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        finalScore: p.finalScore,
        placement: p.placement,
      })),
    };
  });

  return { games, total: games.length };
}

export async function getGameHistoryDetail(gameId: string, userId: string) {
  const db = getDb();

  const membership = await db.query.gamePlayers.findFirst({
    where: and(
      eq(schema.gamePlayers.gameId, gameId),
      eq(schema.gamePlayers.userId, userId)
    ),
  });
  if (!membership) {
    throw new ApiError(403, "FORBIDDEN", "Niste učesnik ove partije");
  }

  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, gameId),
  });
  if (!game || game.status !== "FINISHED") {
    throw new ApiError(404, "GAME_NOT_FOUND", "Završena partija nije pronađena");
  }

  const players = await db
    .select({
      userId: schema.gamePlayers.userId,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      finalScore: schema.gamePlayers.finalScore,
      placement: schema.gamePlayers.placement,
      seatOrder: schema.gamePlayers.seatOrder,
    })
    .from(schema.gamePlayers)
    .innerJoin(schema.users, eq(schema.gamePlayers.userId, schema.users.id))
    .where(eq(schema.gamePlayers.gameId, gameId))
    .orderBy(schema.gamePlayers.seatOrder);

  const me = players.find((p) => p.userId === userId);
  let result: GameResult = "loss";
  if (game.winnerUserId === userId) result = "win";
  else if (me?.placement === 1) result = "win";
  else if (
    me?.finalScore != null &&
    players.every(
      (p) => p.userId === userId || (p.finalScore ?? 0) <= me.finalScore!
    ) &&
    players.filter((p) => p.finalScore === me.finalScore).length > 1
  ) {
    result = "draw";
  }

  return {
    game: {
      id: game.id,
      roomCode: game.roomCode,
      diceMode: game.diceMode,
      status: game.status,
      winnerUserId: game.winnerUserId,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
    },
    myResult: result,
    players,
  };
}

export async function getOpponentHistory(userId: string) {
  const db = getDb();

  const rows = await db
    .select({
      stats: schema.opponentStats,
      opponent: schema.users,
    })
    .from(schema.opponentStats)
    .innerJoin(
      schema.users,
      eq(schema.opponentStats.opponentId, schema.users.id)
    )
    .where(eq(schema.opponentStats.userId, userId))
    .orderBy(desc(schema.opponentStats.matchesPlayed));

  return rows.map(({ stats, opponent }) => ({
    opponentId: opponent.id,
    username: opponent.username,
    displayName: opponent.displayName,
    avatarUrl: opponent.avatarUrl,
    matchesPlayed: stats.matchesPlayed,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    averageMyScore: stats.matchesPlayed
      ? Math.round(stats.totalMyScore / stats.matchesPlayed)
      : 0,
    averageOpponentScore: stats.matchesPlayed
      ? Math.round(stats.totalOpponentScore / stats.matchesPlayed)
      : 0,
  }));
}
