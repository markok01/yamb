import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { ApiError } from "@/server/lib/api-error";
import { getLeagueGameIds, getLeagueRow } from "./league-internal";

export async function computeHeadToHead(
  leagueId: string,
  userAId: string,
  userBId: string
) {
  await getLeagueRow(leagueId);
  const gameIds = await getLeagueGameIds(leagueId);
  if (gameIds.length === 0) {
    return emptyH2H(userAId, userBId);
  }

  const db = getDb();
  const users = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      username: schema.users.username,
    })
    .from(schema.users)
    .where(inArray(schema.users.id, [userAId, userBId]));

  const userA = users.find((u) => u.id === userAId);
  const userB = users.find((u) => u.id === userBId);
  if (!userA || !userB) {
    throw new ApiError(404, "USER_NOT_FOUND", "Igrač nije pronađen");
  }

  const players = await db
    .select({
      gameId: schema.gamePlayers.gameId,
      userId: schema.gamePlayers.userId,
      finalScore: schema.gamePlayers.finalScore,
    })
    .from(schema.gamePlayers)
    .where(
      and(
        inArray(schema.gamePlayers.gameId, gameIds),
        inArray(schema.gamePlayers.userId, [userAId, userBId])
      )
    );

  const byGame = new Map<string, Map<string, number>>();
  for (const p of players) {
    if (!byGame.has(p.gameId)) byGame.set(p.gameId, new Map());
    byGame.get(p.gameId)!.set(p.userId, p.finalScore ?? 0);
  }

  let matches = 0;
  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let totalScoreA = 0;
  let totalScoreB = 0;
  let biggestWinA = 0;
  let biggestWinB = 0;
  let bestScoreA = 0;
  let bestScoreB = 0;

  for (const scores of byGame.values()) {
    if (!scores.has(userAId) || !scores.has(userBId)) continue;
    const scoreA = scores.get(userAId)!;
    const scoreB = scores.get(userBId)!;
    matches++;
    totalScoreA += scoreA;
    totalScoreB += scoreB;
    bestScoreA = Math.max(bestScoreA, scoreA);
    bestScoreB = Math.max(bestScoreB, scoreB);

    if (scoreA > scoreB) {
      winsA++;
      biggestWinA = Math.max(biggestWinA, scoreA - scoreB);
    } else if (scoreB > scoreA) {
      winsB++;
      biggestWinB = Math.max(biggestWinB, scoreB - scoreA);
    } else {
      draws++;
    }
  }

  return {
    userA: { ...userA, ...statsSide(matches, winsA, draws, totalScoreA, bestScoreA, biggestWinA) },
    userB: { ...userB, ...statsSide(matches, winsB, draws, totalScoreB, bestScoreB, biggestWinB) },
    matches,
  };
}

function statsSide(
  matches: number,
  wins: number,
  draws: number,
  totalScore: number,
  bestScore: number,
  biggestWin: number
) {
  const losses = matches - wins - draws;
  return {
    wins,
    losses,
    draws,
    averageScore: matches > 0 ? Math.round((totalScore / matches) * 10) / 10 : 0,
    bestScore,
    biggestWin,
  };
}

function emptyH2H(userAId: string, userBId: string) {
  const zero = statsSide(0, 0, 0, 0, 0, 0);
  return {
    userA: { id: userAId, displayName: "", avatarUrl: null, username: "", ...zero },
    userB: { id: userBId, displayName: "", avatarUrl: null, username: "", ...zero },
    matches: 0,
  };
}

export async function computeHeadToHeadMatrix(leagueId: string) {
  const db = getDb();
  const members = await db
    .select({
      userId: schema.leagueMembers.userId,
      displayName: schema.users.displayName,
    })
    .from(schema.leagueMembers)
    .innerJoin(schema.users, eq(schema.leagueMembers.userId, schema.users.id))
    .where(eq(schema.leagueMembers.leagueId, leagueId));

  const pairs: Array<{
    userAId: string;
    userBId: string;
    userAName: string;
    userBName: string;
    winsA: number;
    winsB: number;
    draws: number;
  }> = [];

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const h2h = await computeHeadToHead(
        leagueId,
        members[i].userId,
        members[j].userId
      );
      pairs.push({
        userAId: members[i].userId,
        userBId: members[j].userId,
        userAName: members[i].displayName,
        userBName: members[j].displayName,
        winsA: h2h.userA.wins,
        winsB: h2h.userB.wins,
        draws: h2h.userA.draws,
      });
    }
  }

  return { members, pairs };
}
