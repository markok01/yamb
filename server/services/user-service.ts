import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { ApiError } from "@/server/lib/api-error";
import type { PublicUser } from "./auth-service";
import { getUserById } from "./auth-service";

export async function updateUserProfile(
  userId: string,
  input: { displayName?: string; avatarUrl?: string | null }
) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Korisnik nije pronađen");
  }

  const updates: Partial<typeof schema.users.$inferInsert> = {};

  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    if (!name) {
      throw new ApiError(400, "INVALID_DISPLAY_NAME", "Ime za prikaz je obavezno");
    }
    updates.displayName = name;
  }

  if (input.avatarUrl !== undefined) {
    const url = input.avatarUrl?.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) {
      throw new ApiError(400, "INVALID_AVATAR_URL", "Avatar mora biti ispravna URL adresa");
    }
    updates.avatarUrl = url;
  }

  if (Object.keys(updates).length === 0) {
    return getUserById(userId) as Promise<PublicUser>;
  }

  await db.update(schema.users).set(updates).where(eq(schema.users.id, userId));
  return (await getUserById(userId)) as PublicUser;
}

export async function deleteUserAccount(userId: string, confirmText: string) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Korisnik nije pronađen");
  }

  const isGuest = !user.passwordHash;
  const expected = isGuest ? user.displayName : user.username;
  const provided = confirmText.trim();
  const matches = isGuest
    ? provided === expected
    : provided.toLowerCase() === expected.toLowerCase();
  if (!matches) {
    throw new ApiError(
      400,
      "CONFIRM_MISMATCH",
      isGuest
        ? "Ime za prikaz se ne poklapa — brisanje otkazano"
        : "Imejl se ne poklapa — brisanje otkazano"
    );
  }

  await db.delete(schema.leagues).where(eq(schema.leagues.createdBy, userId));

  const participations = await db
    .select({ gameId: schema.gamePlayers.gameId })
    .from(schema.gamePlayers)
    .where(eq(schema.gamePlayers.userId, userId));
  const gameIds = [...new Set(participations.map((p) => p.gameId))];

  if (gameIds.length > 0) {
    await db.delete(schema.games).where(inArray(schema.games.id, gameIds));
  }

  await db.delete(schema.games).where(eq(schema.games.hostUserId, userId));

  await db
    .update(schema.games)
    .set({ winnerUserId: null })
    .where(eq(schema.games.winnerUserId, userId));

  await db.delete(schema.users).where(eq(schema.users.id, userId));

  return { ok: true as const };
}
