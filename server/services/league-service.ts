import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { ApiError } from "@/server/lib/api-error";
import { inviteCode, newId } from "@/server/lib/id";
import {
  assertAdmin,
  assertMember,
  assertOwner,
  assertWritable,
  getLeagueGameIds,
  getLeagueRow,
  getMembership,
  mapLeagueBase,
} from "./league/league-internal";
import { computeHeadToHead, computeHeadToHeadMatrix } from "./league/league-h2h";
import {
  addLeagueNotification,
  getLeagueNotifications,
} from "./league/league-notifications";
import { computeLeagueStandings, computeMemberStats } from "./league/league-standings";
import { computeLeagueStatistics } from "./league/league-stats";

export { computeLeagueStandings as getLeagueStandings };

async function buildLeagueDetail(leagueId: string, userId: string) {
  const db = getDb();
  const league = await getLeagueRow(leagueId);

  const members = await db
    .select({
      userId: schema.leagueMembers.userId,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      username: schema.users.username,
      joinedAt: schema.leagueMembers.joinedAt,
      role: schema.leagueMembers.role,
    })
    .from(schema.leagueMembers)
    .innerJoin(schema.users, eq(schema.leagueMembers.userId, schema.users.id))
    .where(eq(schema.leagueMembers.leagueId, leagueId));

  const matches = await db
    .select({
      gameId: schema.leagueMatches.gameId,
      roomCode: schema.games.roomCode,
      finishedAt: schema.games.finishedAt,
      startedAt: schema.games.startedAt,
      winnerUserId: schema.games.winnerUserId,
      addedAt: schema.leagueMatches.addedAt,
    })
    .from(schema.leagueMatches)
    .innerJoin(schema.games, eq(schema.leagueMatches.gameId, schema.games.id))
    .where(eq(schema.leagueMatches.leagueId, leagueId))
    .orderBy(desc(schema.leagueMatches.addedAt));

  const membership = members.find((m) => m.userId === userId);
  const owner = members.find((m) => m.role === "OWNER");

  let ownerName = owner?.displayName ?? null;
  if (!ownerName) {
    const creator = await db.query.users.findFirst({
      where: eq(schema.users.id, league.createdBy),
    });
    ownerName = creator?.displayName ?? null;
  }

  return {
    ...mapLeagueBase(league),
    isMember: !!membership,
    myRole: membership?.role ?? null,
    ownerUserId: owner?.userId ?? league.createdBy,
    ownerName,
    memberCount: members.length,
    members,
    matches,
  };
}

export async function createLeague(
  userId: string,
  input: { name: string; season: string; description?: string }
) {
  const name = input.name.trim();
  const season = input.season.trim();
  const description = input.description?.trim() || null;
  if (!name || !season) {
    throw new ApiError(400, "INVALID_INPUT", "Naziv i sezona su obavezni");
  }

  const db = getDb();
  const leagueId = newId();
  const code = inviteCode();

  await db.insert(schema.leagues).values({
    id: leagueId,
    name,
    season,
    description,
    inviteCode: code,
    createdBy: userId,
  });

  await db.insert(schema.leagueMembers).values({
    leagueId,
    userId,
    role: "OWNER",
  });

  await addLeagueNotification(
    leagueId,
    "league_updated",
    "Liga je kreirana",
    userId
  );

  return getLeague(leagueId, userId);
}

export async function joinLeague(leagueId: string, userId: string) {
  const league = await getLeagueRow(leagueId);
  assertWritable(league.status as "ACTIVE" | "FINISHED" | "ARCHIVED");

  const db = getDb();
  const existing = await getMembership(leagueId, userId);
  if (existing) return getLeague(leagueId, userId);

  const memberCount = await db
    .select({ userId: schema.leagueMembers.userId })
    .from(schema.leagueMembers)
    .where(eq(schema.leagueMembers.leagueId, leagueId));

  if (memberCount.length >= league.maxMembers) {
    throw new ApiError(400, "LEAGUE_FULL", "Liga je popunjena");
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  await db.insert(schema.leagueMembers).values({ leagueId, userId, role: "MEMBER" });
  await addLeagueNotification(
    leagueId,
    "member_joined",
    `${user?.displayName ?? "Igrač"} se pridružio ligi`,
    userId
  );

  return getLeague(leagueId, userId);
}

export async function joinLeagueByCode(code: string, userId: string) {
  const db = getDb();
  const league = await db.query.leagues.findFirst({
    where: eq(schema.leagues.inviteCode, code.toUpperCase()),
  });
  if (!league) {
    throw new ApiError(404, "LEAGUE_NOT_FOUND", "Pozivni kod nije validan");
  }
  return joinLeague(league.id, userId);
}

export async function addGameToLeague(
  leagueId: string,
  gameId: string,
  userId: string
) {
  const league = await getLeagueRow(leagueId);
  assertWritable(league.status as "ACTIVE" | "FINISHED" | "ARCHIVED");
  await assertMember(leagueId, userId);

  const db = getDb();
  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, gameId),
  });
  if (!game || game.status !== "FINISHED") {
    throw new ApiError(400, "GAME_NOT_FINISHED", "Samo završene partije mogu u ligu");
  }

  const existing = await db.query.leagueMatches.findFirst({
    where: eq(schema.leagueMatches.gameId, gameId),
  });
  if (existing && existing.leagueId !== leagueId) {
    throw new ApiError(409, "GAME_IN_LEAGUE", "Partija je već u drugoj ligi");
  }
  if (!existing) {
    await db.insert(schema.leagueMatches).values({ leagueId, gameId });
    await addLeagueNotification(
      leagueId,
      "game_added",
      `Partija ${game.roomCode} dodata u ligu`,
      userId
    );
  }

  return { leagueId, gameId };
}

export async function getLeague(leagueId: string, userId: string) {
  const league = await getLeagueRow(leagueId);
  const detail = await buildLeagueDetail(leagueId, userId);

  if (!league.isPublic && !detail.isMember) {
    throw new ApiError(403, "FORBIDDEN", "Privatna liga — potreban je poziv");
  }

  return detail;
}

export async function getUserLeagues(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      league: schema.leagues,
      role: schema.leagueMembers.role,
    })
    .from(schema.leagueMembers)
    .innerJoin(schema.leagues, eq(schema.leagueMembers.leagueId, schema.leagues.id))
    .where(eq(schema.leagueMembers.userId, userId));

  const result = [];
  for (const row of rows) {
    const members = await db
      .select({ userId: schema.leagueMembers.userId })
      .from(schema.leagueMembers)
      .where(eq(schema.leagueMembers.leagueId, row.league.id));
    result.push({
      ...mapLeagueBase(row.league),
      myRole: row.role,
      memberCount: members.length,
    });
  }
  return result;
}

export async function updateLeague(
  leagueId: string,
  userId: string,
  input: {
    name?: string;
    season?: string;
    description?: string | null;
    maxMembers?: number;
    imageUrl?: string | null;
    isPublic?: boolean;
  }
) {
  const league = await getLeagueRow(leagueId);
  assertWritable(league.status as "ACTIVE" | "FINISHED" | "ARCHIVED");
  await assertAdmin(leagueId, userId);

  const db = getDb();
  const updates: Partial<typeof schema.leagues.$inferInsert> = {};

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.season !== undefined) {
    updates.season = input.season.trim();
    await addLeagueNotification(
      leagueId,
      "season_changed",
      `Sezona promenjena na ${input.season.trim()}`,
      userId
    );
  }
  if (input.description !== undefined) updates.description = input.description;
  if (input.maxMembers !== undefined) updates.maxMembers = input.maxMembers;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
  if (input.isPublic !== undefined) updates.isPublic = input.isPublic;

  if (Object.keys(updates).length === 0) return getLeague(leagueId, userId);

  await db.update(schema.leagues).set(updates).where(eq(schema.leagues.id, leagueId));
  await addLeagueNotification(leagueId, "league_updated", "Podešavanja lige ažurirana", userId);

  return getLeague(leagueId, userId);
}

export async function regenerateInviteCode(leagueId: string, userId: string) {
  await assertAdmin(leagueId, userId);
  const code = inviteCode();
  const db = getDb();
  await db
    .update(schema.leagues)
    .set({ inviteCode: code })
    .where(eq(schema.leagues.id, leagueId));
  return { inviteCode: code };
}

export async function leaveLeague(leagueId: string, userId: string) {
  const membership = await assertMember(leagueId, userId);
  if (membership.role === "OWNER") {
    throw new ApiError(
      400,
      "OWNER_CANNOT_LEAVE",
      "Vlasnik mora preneti vlasništvo pre napuštanja"
    );
  }

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  await db
    .delete(schema.leagueMembers)
    .where(
      and(
        eq(schema.leagueMembers.leagueId, leagueId),
        eq(schema.leagueMembers.userId, userId)
      )
    );

  await addLeagueNotification(
    leagueId,
    "member_left",
    `${user?.displayName ?? "Igrač"} je napustio ligu`,
    userId
  );

  return { ok: true };
}

export async function removeMember(
  leagueId: string,
  adminUserId: string,
  targetUserId: string
) {
  await assertAdmin(leagueId, adminUserId);
  const target = await getMembership(leagueId, targetUserId);
  if (!target) {
    throw new ApiError(404, "MEMBER_NOT_FOUND", "Član nije pronađen");
  }
  if (target.role === "OWNER") {
    throw new ApiError(400, "CANNOT_REMOVE_OWNER", "Vlasnik se ne može ukloniti");
  }

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, targetUserId),
  });

  await db
    .delete(schema.leagueMembers)
    .where(
      and(
        eq(schema.leagueMembers.leagueId, leagueId),
        eq(schema.leagueMembers.userId, targetUserId)
      )
    );

  await addLeagueNotification(
    leagueId,
    "member_removed",
    `${user?.displayName ?? "Igrač"} je uklonjen iz lige`,
    adminUserId
  );

  return { ok: true };
}

export async function addMemberByUsername(
  leagueId: string,
  adminUserId: string,
  username: string
) {
  const league = await getLeagueRow(leagueId);
  assertWritable(league.status as "ACTIVE" | "FINISHED" | "ARCHIVED");
  await assertAdmin(leagueId, adminUserId);

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username.trim()),
  });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Korisnik nije pronađen");
  }

  return joinLeague(leagueId, user.id);
}

export async function transferOwnership(
  leagueId: string,
  ownerUserId: string,
  newOwnerUserId: string
) {
  await assertOwner(leagueId, ownerUserId);
  const newOwner = await getMembership(leagueId, newOwnerUserId);
  if (!newOwner) {
    throw new ApiError(404, "MEMBER_NOT_FOUND", "Novi vlasnik mora biti član lige");
  }

  const db = getDb();
  await db
    .update(schema.leagueMembers)
    .set({ role: "MEMBER" })
    .where(
      and(
        eq(schema.leagueMembers.leagueId, leagueId),
        eq(schema.leagueMembers.userId, ownerUserId)
      )
    );
  await db
    .update(schema.leagueMembers)
    .set({ role: "OWNER" })
    .where(
      and(
        eq(schema.leagueMembers.leagueId, leagueId),
        eq(schema.leagueMembers.userId, newOwnerUserId)
      )
    );
  await db
    .update(schema.leagues)
    .set({ createdBy: newOwnerUserId })
    .where(eq(schema.leagues.id, leagueId));

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, newOwnerUserId),
  });
  await addLeagueNotification(
    leagueId,
    "admin_changed",
    `${user?.displayName ?? "Igrač"} je novi administrator lige`,
    ownerUserId
  );

  return getLeague(leagueId, ownerUserId);
}

export async function promoteMember(
  leagueId: string,
  ownerUserId: string,
  targetUserId: string,
  role: "ADMIN" | "MEMBER"
) {
  await assertOwner(leagueId, ownerUserId);
  const target = await getMembership(leagueId, targetUserId);
  if (!target || target.role === "OWNER") {
    throw new ApiError(400, "INVALID_TARGET", "Nevalidan član");
  }

  const db = getDb();
  await db
    .update(schema.leagueMembers)
    .set({ role })
    .where(
      and(
        eq(schema.leagueMembers.leagueId, leagueId),
        eq(schema.leagueMembers.userId, targetUserId)
      )
    );

  return { ok: true };
}

export async function archiveLeague(leagueId: string, userId: string) {
  await assertOwner(leagueId, userId);
  const db = getDb();
  await db
    .update(schema.leagues)
    .set({ status: "ARCHIVED", archivedAt: new Date() })
    .where(eq(schema.leagues.id, leagueId));
  await addLeagueNotification(
    leagueId,
    "league_archived",
    "Liga je arhivirana",
    userId
  );
  return getLeague(leagueId, userId);
}

export async function deleteLeague(
  leagueId: string,
  userId: string,
  confirmName: string
) {
  const league = await getLeagueRow(leagueId);
  await assertOwner(leagueId, userId);

  if (confirmName.trim() !== league.name) {
    throw new ApiError(
      400,
      "CONFIRM_NAME_MISMATCH",
      "Naziv lige se ne poklapa — brisanje otkazano"
    );
  }

  const db = getDb();
  await db.delete(schema.leagues).where(eq(schema.leagues.id, leagueId));
  return { ok: true };
}

export async function getLeagueHistory(leagueId: string) {
  await getLeagueRow(leagueId);
  const gameIds = await getLeagueGameIds(leagueId);
  if (gameIds.length === 0) return { matches: [] };

  const db = getDb();

  const games = await db
    .select({
      gameId: schema.games.id,
      roomCode: schema.games.roomCode,
      finishedAt: schema.games.finishedAt,
      startedAt: schema.games.startedAt,
      winnerUserId: schema.games.winnerUserId,
      diceMode: schema.games.diceMode,
    })
    .from(schema.games)
    .where(inArray(schema.games.id, gameIds))
    .orderBy(desc(schema.games.finishedAt));

  const players = await db
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

  const byGame = new Map<string, typeof players>();
  for (const p of players) {
    const list = byGame.get(p.gameId) ?? [];
    list.push(p);
    byGame.set(p.gameId, list);
  }

  const matches = games.map((g) => {
    const gamePlayers = byGame.get(g.gameId) ?? [];
    const winner = gamePlayers.find((p) => p.userId === g.winnerUserId);
    const durationMs =
      g.startedAt && g.finishedAt
        ? new Date(g.finishedAt).getTime() - new Date(g.startedAt).getTime()
        : null;

    return {
      gameId: g.gameId,
      roomCode: g.roomCode,
      finishedAt: g.finishedAt,
      startedAt: g.startedAt,
      durationMs,
      diceMode: g.diceMode,
      winnerUserId: g.winnerUserId,
      winnerName: winner?.displayName ?? null,
      players: gamePlayers.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        finalScore: p.finalScore,
        placement: p.placement,
      })),
    };
  });

  return { matches };
}

export {
  computeHeadToHead,
  computeHeadToHeadMatrix,
  computeLeagueStatistics,
  computeMemberStats,
  getLeagueNotifications,
};
