import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { DbSnapshot } from "./types";
import { EMPTY_DB } from "./types";

const DB_PATH = path.join(process.cwd(), ".data", "yamb-db.json");

let cache: DbSnapshot | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function ensureDir() {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
}

async function load(): Promise<DbSnapshot> {
  if (cache) return cache;
  try {
    const raw = await readFile(DB_PATH, "utf8");
    cache = JSON.parse(raw) as DbSnapshot;
  } catch {
    cache = clone(EMPTY_DB);
    await persist();
  }
  return cache!;
}

async function persist() {
  if (!cache) return;
  await ensureDir();
  await writeFile(DB_PATH, JSON.stringify(cache, null, 2), "utf8");
}

export function withFileDb<T>(fn: (db: DbSnapshot) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = await load();
    const result = await fn(db);
    await persist();
    return result;
  };

  const chained = writeQueue.then(run, run);
  writeQueue = chained.then(
    () => undefined,
    () => undefined
  );
  return chained;
}

export function isFileDbMode(): boolean {
  return !process.env.DATABASE_URL;
}

export function getDbMode(): "mysql" | "file" {
  return isFileDbMode() ? "file" : "mysql";
}
