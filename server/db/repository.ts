// @ts-nocheck — legacy file-db layer; not used by active services
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getMysqlDb, schema } from "./mysql";
import { withFileDb } from "./file-store";
import type {
  DbSnapshot,
  PlayerCombinationStatsRow,
  PlayerStatsRow,
} from "./types";
import type {
  Game,
  GamePlayer,
  RollEventRow,
  ScoreEntryRow,
  TurnRow,
  User,
} from "./schema";
import { isFileDbMode } from "./file-store";

function reviveDates<T extends Record<string, unknown>>(row: T): T {
  const next: Record<string, unknown> = { ...row };
  for (const key of Object.keys(next)) {
    const val = next[key];
    if (
      typeof val === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(val) &&
      (key.endsWith("At") || key === "updatedAt")
    ) {
      next[key] = new Date(val);
    }
  }
  return next as T;
}

// --- Users ---

export async function insertUser(
  user: Omit<User, "createdAt"> & { createdAt?: Date }
): Promise<User> {
  const row: User = {
    ...user,
    createdAt: user.createdAt ?? new Date(),
  };

  if (isFileDbMode()) {
    return withFileDb((db) => {
      db.users.push(row);
      return row;
    });
  }

  const db = getMysqlDb();
  await db.insert(schema.users).values(row);
  return row;
}

export async function findUserById(userId: string): Promise<User | null> {
  if (isFileDbMode()) {
    return withFileDb((db) => db.users.find((u) => u.id === userId) ?? null);
  }

  const db = getMysqlDb();
  return (
    (await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    })) ?? null
  );
}

// --- Games ---

export async function insertGame(
  game: Omit<Game, "createdAt" | "startedAt" | "finishedAt" | "winnerUserId"> &
    Partial<Pick<Game, "createdAt" | "startedAt" | "finishedAt" | "winnerUserId">>
): Promise<Game> {
  const row: Game = {
    ...game,
    winnerUserId: game.winnerUserId ?? null,
    startedAt: game.startedAt ?? null,
    finishedAt: game.finishedAt ?? null,
    createdAt: game.createdAt ?? new Date(),
    stateVersion: game.stateVersion ?? 0,
  };

  if (isFileDbMode()) {
    return withFileDb((db) => {
      db.games.push(row);
      return row;
    });
  }

  const db = getMysqlDb();
  await db.insert(schema.games).values(row);
  return row;
}

export async function findGameById(gameId: string): Promise<Game | null> {
  if (isFileDbMode()) {
    return withFileDb(
      (db) => reviveDates(db.games.find((g) => g.id === gameId) ?? null) ?? null
    );
  }

  const db = getMysqlDb();
  return (
    (await db.query.games.findFirst({
      where: eq(schema.games.id, gameId),
    })) ?? null
  );
}

export async function findGameByRoomCode(
  roomCode: string
): Promise<Game | null> {
  if (isFileDbMode()) {
    return withFileDb(
      (db) =>
        reviveDates(
          db.games.find(
            (g) => g.roomCode === roomCode.toUpperCase()
          ) ?? null
        ) ?? null
    );
  }

  const db = getMysqlDb();
  return (
    (await db.query.games.findFirst({
      where: eq(schema.games.roomCode, roomCode.toUpperCase()),
    })) ?? null
  );
}

export async function updateGame(
  gameId: string,
  patch: Partial<Game>
): Promise<void> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const game = db.games.find((g) => g.id === gameId);
      if (game) Object.assign(game, patch);
    });
  }

  const db = getMysqlDb();
  await db.update(schema.games).set(patch).where(eq(schema.games.id, gameId));
}

export async function bumpGameStateVersionRepo(
  gameId: string
): Promise<number> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const game = db.games.find((g) => g.id === gameId);
      if (!game) return 0;
      game.stateVersion = (game.stateVersion ?? 0) + 1;
      return game.stateVersion;
    });
  }

  const db = getMysqlDb();
  await db
    .update(schema.games)
    .set({ stateVersion: sql`${schema.games.stateVersion} + 1` })
    .where(eq(schema.games.id, gameId));

  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, gameId),
    columns: { stateVersion: true },
  });
  return game?.stateVersion ?? 0;
}

// --- Game players ---

export async function insertGamePlayer(
  player: Omit<GamePlayer, "joinedAt" | "finalScore" | "placement"> &
    Partial<Pick<GamePlayer, "joinedAt" | "finalScore" | "placement">>
): Promise<GamePlayer> {
  const row: GamePlayer = {
    finalScore: null,
    placement: null,
    joinedAt: new Date(),
    ...player,
  };

  if (isFileDbMode()) {
    return withFileDb((db) => {
      db.gamePlayers.push(row);
      return row;
    });
  }

  const db = getMysqlDb();
  await db.insert(schema.gamePlayers).values(row);
  return row;
}

export async function updateGamePlayer(
  playerId: string,
  patch: Partial<GamePlayer>
): Promise<void> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const player = db.gamePlayers.find((p) => p.id === playerId);
      if (player) Object.assign(player, patch);
    });
  }

  const db = getMysqlDb();
  await db
    .update(schema.gamePlayers)
    .set(patch)
    .where(eq(schema.gamePlayers.id, playerId));
}

export async function findGamePlayersWithUsers(gameId: string) {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const players = db.gamePlayers
        .filter((p) => p.gameId === gameId)
        .sort((a, b) => a.seatOrder - b.seatOrder);
      return players.map((player) => ({
        player: reviveDates(player),
        user: db.users.find((u) => u.id === player.userId)!,
      }));
    });
  }

  const db = getMysqlDb();
  return db
    .select({ player: schema.gamePlayers, user: schema.users })
    .from(schema.gamePlayers)
    .innerJoin(schema.users, eq(schema.gamePlayers.userId, schema.users.id))
    .where(eq(schema.gamePlayers.gameId, gameId))
    .orderBy(asc(schema.gamePlayers.seatOrder));
}

export async function findPlayerInGame(
  gameId: string,
  userId: string
): Promise<GamePlayer | null> {
  if (isFileDbMode()) {
    return withFileDb(
      (db) =>
        reviveDates(
          db.gamePlayers.find(
            (p) => p.gameId === gameId && p.userId === userId
          ) ?? null
        ) ?? null
    );
  }

  const db = getMysqlDb();
  const row = await db
    .select({ player: schema.gamePlayers })
    .from(schema.gamePlayers)
    .where(
      and(
        eq(schema.gamePlayers.gameId, gameId),
        eq(schema.gamePlayers.userId, userId)
      )
    )
    .limit(1);
  return row[0]?.player ?? null;
}

// --- Score entries ---

export async function insertScoreEntry(
  entry: Omit<ScoreEntryRow, "createdAt"> & { createdAt?: Date }
): Promise<ScoreEntryRow> {
  const row: ScoreEntryRow = {
    createdAt: new Date(),
    ...entry,
  };

  if (isFileDbMode()) {
    return withFileDb((db) => {
      db.scoreEntries.push(row);
      return row;
    });
  }

  const db = getMysqlDb();
  await db.insert(schema.scoreEntries).values(row);
  return row;
}

export async function findScoreEntriesByPlayer(
  gamePlayerId: string
): Promise<ScoreEntryRow[]> {
  if (isFileDbMode()) {
    return withFileDb((db) =>
      db.scoreEntries
        .filter((e) => e.gamePlayerId === gamePlayerId)
        .map(reviveDates)
    );
  }

  const db = getMysqlDb();
  return db.query.scoreEntries.findMany({
    where: eq(schema.scoreEntries.gamePlayerId, gamePlayerId),
  });
}

// --- Turns ---

export async function insertTurn(
  turn: Omit<TurnRow, "startedAt" | "completedAt" | "najavaRowKey"> &
    Partial<Pick<TurnRow, "startedAt" | "completedAt" | "najavaRowKey">>
): Promise<TurnRow> {
  const row: TurnRow = {
    najavaRowKey: null,
    startedAt: new Date(),
    completedAt: null,
    ...turn,
  };

  if (isFileDbMode()) {
    return withFileDb((db) => {
      db.turns.push(row);
      return row;
    });
  }

  const db = getMysqlDb();
  await db.insert(schema.turns).values(row);
  return row;
}

export async function updateTurn(
  turnId: string,
  patch: Partial<TurnRow>
): Promise<void> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const turn = db.turns.find((t) => t.id === turnId);
      if (turn) Object.assign(turn, patch);
    });
  }

  const db = getMysqlDb();
  await db.update(schema.turns).set(patch).where(eq(schema.turns.id, turnId));
}

export async function findActiveTurn(gameId: string): Promise<TurnRow | null> {
  if (isFileDbMode()) {
    return withFileDb(
      (db) =>
        reviveDates(
          db.turns.find(
            (t) => t.gameId === gameId && t.status === "ACTIVE"
          ) ?? null
        ) ?? null
    );
  }

  const db = getMysqlDb();
  return (
    (await db.query.turns.findFirst({
      where: and(
        eq(schema.turns.gameId, gameId),
        eq(schema.turns.status, "ACTIVE")
      ),
    })) ?? null
  );
}

// --- Roll events ---

export async function insertRollEvent(
  event: Omit<RollEventRow, "createdAt"> & { createdAt?: Date }
): Promise<RollEventRow> {
  const row: RollEventRow = {
    createdAt: new Date(),
    ...event,
  };

  if (isFileDbMode()) {
    return withFileDb((db) => {
      db.rollEvents.push(row);
      return row;
    });
  }

  const db = getMysqlDb();
  await db.insert(schema.rollEvents).values(row);
  return row;
}

export async function findRollEventsByTurn(
  turnId: string
): Promise<RollEventRow[]> {
  if (isFileDbMode()) {
    return withFileDb((db) =>
      db.rollEvents.filter((e) => e.turnId === turnId).map(reviveDates)
    );
  }

  const db = getMysqlDb();
  return db.query.rollEvents.findMany({
    where: eq(schema.rollEvents.turnId, turnId),
  });
}

// --- Stats ---

export async function ensurePlayerStats(userId: string): Promise<void> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      if (!db.playerStats.find((s) => s.userId === userId)) {
        db.playerStats.push({
          userId,
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          totalScore: 0,
          averageScore: 0,
          bestScore: null,
          worstScore: null,
          updatedAt: new Date(),
        });
      }
    });
  }

  const db = getMysqlDb();
  const existing = await db.query.playerStats.findFirst({
    where: eq(schema.playerStats.userId, userId),
  });
  if (!existing) {
    await db.insert(schema.playerStats).values({ userId });
  }
}

const COMBO_ROWS = ["KENTA", "TRILING", "FUL", "POKER", "JAMB"] as const;

export async function ensureComboStats(userId: string): Promise<void> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      for (const combo of COMBO_ROWS) {
        if (
          !db.playerCombinationStats.find(
            (c) => c.userId === userId && c.combination === combo
          )
        ) {
          db.playerCombinationStats.push({
            userId,
            combination: combo,
            countSuccess: 0,
            countFailed: 0,
          });
        }
      }
    });
  }

  const db = getMysqlDb();
  for (const combo of COMBO_ROWS) {
    const existing = await db.query.playerCombinationStats.findFirst({
      where: and(
        eq(schema.playerCombinationStats.userId, userId),
        eq(schema.playerCombinationStats.combination, combo)
      ),
    });
    if (!existing) {
      await db.insert(schema.playerCombinationStats).values({
        userId,
        combination: combo,
      });
    }
  }
}

export async function getPlayerStatsRow(
  userId: string
): Promise<PlayerStatsRow | null> {
  if (isFileDbMode()) {
    return withFileDb(
      (db) =>
        reviveDates(
          db.playerStats.find((s) => s.userId === userId) ?? null
        ) ?? null
    );
  }

  const db = getMysqlDb();
  return (
    (await db.query.playerStats.findFirst({
      where: eq(schema.playerStats.userId, userId),
    })) ?? null
  );
}

export async function updatePlayerStatsRow(
  userId: string,
  patch: Partial<PlayerStatsRow>
): Promise<void> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const row = db.playerStats.find((s) => s.userId === userId);
      if (row) Object.assign(row, patch, { updatedAt: new Date() });
    });
  }

  const db = getMysqlDb();
  await db
    .update(schema.playerStats)
    .set(patch)
    .where(eq(schema.playerStats.userId, userId));
}

export async function getPlayerComboStats(
  userId: string
): Promise<PlayerCombinationStatsRow[]> {
  if (isFileDbMode()) {
    return withFileDb((db) =>
      db.playerCombinationStats.filter((c) => c.userId === userId)
    );
  }

  const db = getMysqlDb();
  return db
    .select()
    .from(schema.playerCombinationStats)
    .where(eq(schema.playerCombinationStats.userId, userId));
}

export async function updatePlayerComboStats(
  userId: string,
  combination: PlayerCombinationStatsRow["combination"],
  patch: Partial<PlayerCombinationStatsRow>
): Promise<void> {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const row = db.playerCombinationStats.find(
        (c) => c.userId === userId && c.combination === combination
      );
      if (row) Object.assign(row, patch);
    });
  }

  const db = getMysqlDb();
  await db
    .update(schema.playerCombinationStats)
    .set(patch)
    .where(
      and(
        eq(schema.playerCombinationStats.userId, userId),
        eq(schema.playerCombinationStats.combination, combination)
      )
    );
}

export async function findRecentFinishedGames(userId: string, limit = 20) {
  if (isFileDbMode()) {
    return withFileDb((db) => {
      const rows = db.gamePlayers
        .filter((p) => p.userId === userId)
        .map((player) => ({
          player: reviveDates(player),
          game: reviveDates(
            db.games.find(
              (g) => g.id === player.gameId && g.status === "FINISHED"
            )!
          ),
        }))
        .filter((r) => r.game)
        .sort(
          (a, b) =>
            new Date(b.game.finishedAt ?? 0).getTime() -
            new Date(a.game.finishedAt ?? 0).getTime()
        )
        .slice(0, limit);
      return rows;
    });
  }

  const db = getMysqlDb();
  return db
    .select({ game: schema.games, player: schema.gamePlayers })
    .from(schema.gamePlayers)
    .innerJoin(schema.games, eq(schema.gamePlayers.gameId, schema.games.id))
    .where(
      and(
        eq(schema.gamePlayers.userId, userId),
        eq(schema.games.status, "FINISHED")
      )
    )
    .orderBy(desc(schema.games.finishedAt))
    .limit(limit);
}

// silence unused import warning for DbSnapshot in future
export type { DbSnapshot };
