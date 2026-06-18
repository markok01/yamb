import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { ApiError } from "@/server/lib/api-error";

export type LeagueMemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type LeagueStatus = "ACTIVE" | "FINISHED" | "ARCHIVED";

export async function getLeagueRow(leagueId: string) {
  const db = getDb();
  const league = await db.query.leagues.findFirst({
    where: eq(schema.leagues.id, leagueId),
  });
  if (!league) {
    throw new ApiError(404, "LEAGUE_NOT_FOUND", "Liga nije pronađena");
  }
  return league;
}

export async function getMembership(leagueId: string, userId: string) {
  const db = getDb();
  return db.query.leagueMembers.findFirst({
    where: and(
      eq(schema.leagueMembers.leagueId, leagueId),
      eq(schema.leagueMembers.userId, userId)
    ),
  });
}

export async function assertMember(leagueId: string, userId: string) {
  const membership = await getMembership(leagueId, userId);
  if (!membership) {
    throw new ApiError(403, "FORBIDDEN", "Niste član ove lige");
  }
  return membership;
}

export async function assertAdmin(leagueId: string, userId: string) {
  const membership = await assertMember(leagueId, userId);
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Samo administrator može ovu akciju");
  }
  return membership;
}

export async function assertOwner(leagueId: string, userId: string) {
  const membership = await assertMember(leagueId, userId);
  if (membership.role !== "OWNER") {
    throw new ApiError(403, "FORBIDDEN", "Samo vlasnik lige može ovu akciju");
  }
  return membership;
}

export function assertWritable(status: LeagueStatus) {
  if (status === "ARCHIVED") {
    throw new ApiError(
      400,
      "LEAGUE_ARCHIVED",
      "Liga je arhivirana — samo pregled"
    );
  }
}

export async function getLeagueGameIds(leagueId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ gameId: schema.leagueMatches.gameId })
    .from(schema.leagueMatches)
    .where(eq(schema.leagueMatches.leagueId, leagueId));
  return rows.map((r) => r.gameId);
}

export function mapLeagueBase(league: typeof schema.leagues.$inferSelect) {
  return {
    id: league.id,
    name: league.name,
    season: league.season,
    description: league.description ?? null,
    status: league.status as LeagueStatus,
    inviteCode: league.inviteCode,
    isPublic: league.isPublic,
    maxMembers: league.maxMembers,
    imageUrl: league.imageUrl ?? null,
    createdBy: league.createdBy,
    createdAt: league.createdAt,
    updatedAt: league.updatedAt,
    archivedAt: league.archivedAt ?? null,
  };
}
