import { randomBytes } from "crypto";

export function newId(): string {
  return crypto.randomUUID();
}

export function roomCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

export function inviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
}
