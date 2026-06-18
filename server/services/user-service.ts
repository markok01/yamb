import { eq } from "drizzle-orm";
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
