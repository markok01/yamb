import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { ApiError } from "./api-error";
import { getSessionUserIdFromRequest } from "./session";

export async function requireUserId(request: Request): Promise<string> {
  const sessionUserId = await getSessionUserIdFromRequest(request);
  const headerUserId = request.headers.get("x-user-id");
  const userId = sessionUserId ?? headerUserId;

  if (!userId) {
    throw new ApiError(401, "UNAUTHORIZED", "Morate biti ulogovani");
  }

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Korisnik nije pronađen");
  }

  if (sessionUserId && headerUserId && sessionUserId !== headerUserId) {
    throw new ApiError(401, "UNAUTHORIZED", "Sesija ne odgovara korisniku");
  }

  return userId;
}
