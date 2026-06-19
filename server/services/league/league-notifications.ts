import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { newId } from "@/server/lib/id";

export type LeagueNotificationType =
  | "member_joined"
  | "member_left"
  | "member_removed"
  | "game_added"
  | "game_cancelled"
  | "admin_changed"
  | "season_changed"
  | "league_archived"
  | "league_updated";

export async function addLeagueNotification(
  leagueId: string,
  type: LeagueNotificationType,
  message: string,
  actorUserId?: string
) {
  const db = getDb();
  await db.insert(schema.leagueNotifications).values({
    id: newId(),
    leagueId,
    type,
    message,
    actorUserId: actorUserId ?? null,
  });
}

export async function getLeagueNotifications(leagueId: string, limit = 30) {
  const db = getDb();
  return db
    .select({
      id: schema.leagueNotifications.id,
      type: schema.leagueNotifications.type,
      message: schema.leagueNotifications.message,
      actorUserId: schema.leagueNotifications.actorUserId,
      actorName: schema.users.displayName,
      createdAt: schema.leagueNotifications.createdAt,
    })
    .from(schema.leagueNotifications)
    .leftJoin(
      schema.users,
      eq(schema.leagueNotifications.actorUserId, schema.users.id)
    )
    .where(eq(schema.leagueNotifications.leagueId, leagueId))
    .orderBy(desc(schema.leagueNotifications.createdAt))
    .limit(limit);
}
