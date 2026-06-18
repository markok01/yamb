import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { ApiError } from "@/server/lib/api-error";
import { newId } from "@/server/lib/id";
import { createSessionToken } from "@/server/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 6;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmail(email: string): void {
  if (!email) {
    throw new ApiError(400, "INVALID_EMAIL", "Imejl adresa je obavezna");
  }
  if (email.length > 255) {
    throw new ApiError(400, "INVALID_EMAIL", "Imejl adresa je predugačka");
  }
  if (!EMAIL_RE.test(email)) {
    throw new ApiError(400, "INVALID_EMAIL", "Unesite ispravnu email adresu");
  }
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isGuest: boolean;
}

function toPublicUser(row: typeof schema.users.$inferSelect): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl ?? null,
    isGuest: !row.passwordHash,
  };
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
  return user ? toPublicUser(user) : null;
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const username = normalizeEmail(input.email);
  validateEmail(username);
  const displayName = input.displayName.trim();
  const password = input.password;
  if (password.length < MIN_PASSWORD_LEN) {
    throw new ApiError(
      400,
      "WEAK_PASSWORD",
      `Lozinka mora imati najmanje ${MIN_PASSWORD_LEN} karaktera`
    );
  }
  if (!displayName) {
    throw new ApiError(400, "INVALID_DISPLAY_NAME", "Ime za prikaz je obavezno");
  }

  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
  });
  if (existing) {
    throw new ApiError(409, "EMAIL_TAKEN", "Imejl adresa je već registrovana");
  }

  const id = newId();
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(schema.users).values({
    id,
    username,
    passwordHash,
    displayName,
  });

  const user = toPublicUser({
    id,
    username,
    passwordHash,
    displayName,
    avatarUrl: null,
    createdAt: new Date(),
  });

  const token = await createSessionToken(id);
  return { user, token };
}

export async function loginUser(identifier: string, password: string) {
  const db = getDb();
  const normalized = identifier.trim().toLowerCase();
  const username = normalized.includes("@")
    ? normalizeEmail(identifier)
    : normalized;

  if (normalized.includes("@")) {
    validateEmail(username);
  }

  const row = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
  });

  if (!row?.passwordHash) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Pogrešan email ili lozinka");
  }

  const valid = await bcrypt.compare(password, row.passwordHash);
  if (!valid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Pogrešan email ili lozinka");
  }

  const user = toPublicUser(row);
  const token = await createSessionToken(row.id);
  return { user, token };
}

export async function createGuestUser(displayName: string) {
  const db = getDb();
  const id = newId();
  const username = `guest_${id.slice(0, 8)}`;

  await db.insert(schema.users).values({
    id,
    username,
    displayName,
    passwordHash: null,
  });

  return toPublicUser({
    id,
    username,
    passwordHash: null,
    displayName,
    avatarUrl: null,
    createdAt: new Date(),
  });
}
