import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const columnTypeEnum = mysqlEnum("column_type", [
  "REDOVNA",
  "PREKOREDA",
  "OBRNUTA",
  "NAJAVA",
  "RUCNA",
  "DOJAVA",
  "DVOSTRUKA",
  "UKRSTENA",
  "OBAVEZNA",
  "MAKSIMALNA",
]);

const rowKeyValues = [
  "ROW_1",
  "ROW_2",
  "ROW_3",
  "ROW_4",
  "ROW_5",
  "ROW_6",
  "MAXIMUM",
  "MINIMUM",
  "KENTA",
  "TRILING",
  "FUL",
  "POKER",
  "JAMB",
] as const;

export const rowKeyEnum = mysqlEnum("row_key", [...rowKeyValues]);

export const najavaRowKeyEnum = mysqlEnum("najava_row_key", [...rowKeyValues]);

export const gameStatusEnum = mysqlEnum("status", [
  "LOBBY",
  "IN_PROGRESS",
  "FINISHED",
  "CANCELLED",
]);

export const turnStatusEnum = mysqlEnum("status", [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const diceModeEnum = mysqlEnum("dice_mode", ["VIRTUAL", "PHYSICAL"]);

export const combinationEnum = mysqlEnum("combination", [
  "KENTA",
  "TRILING",
  "FUL",
  "POKER",
  "JAMB",
]);

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const games = mysqlTable("games", {
  id: varchar("id", { length: 36 }).primaryKey(),
  roomCode: varchar("room_code", { length: 8 }).notNull().unique(),
  status: gameStatusEnum.notNull().default("LOBBY"),
  maxPlayers: tinyint("max_players").notNull().default(6),
  currentPlayerIndex: tinyint("current_player_index"),
  hostUserId: varchar("host_user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  winnerUserId: varchar("winner_user_id", { length: 36 }).references(
    () => users.id
  ),
  diceMode: diceModeEnum.notNull().default("VIRTUAL"),
  stateVersion: int("state_version").notNull().default(0),
  directedRowKey: mysqlEnum("directed_row_key", [...rowKeyValues]),
  directorGamePlayerId: varchar("director_game_player_id", { length: 36 }),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gamePlayers = mysqlTable(
  "game_players",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    gameId: varchar("game_id", { length: 36 })
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    seatOrder: tinyint("seat_order").notNull(),
    finalScore: int("final_score"),
    placement: tinyint("placement"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_game_players_game_user").on(table.gameId, table.userId),
    uniqueIndex("uq_game_players_game_seat").on(table.gameId, table.seatOrder),
  ]
);

export const scoreEntries = mysqlTable(
  "score_entries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    gamePlayerId: varchar("game_player_id", { length: 36 })
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    columnType: columnTypeEnum.notNull(),
    rowKey: rowKeyEnum.notNull(),
    score: int("score").notNull(),
    diceSnapshot: json("dice_snapshot").$type<number[]>().notNull(),
    isManual: boolean("is_manual").notNull().default(false),
    isNajava: boolean("is_najava").notNull().default(false),
    dojavaAccepted: boolean("dojava_accepted"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_score_entry_cell").on(
      table.gamePlayerId,
      table.columnType,
      table.rowKey
    ),
  ]
);

export const turns = mysqlTable("turns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  gameId: varchar("game_id", { length: 36 })
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  gamePlayerId: varchar("game_player_id", { length: 36 })
    .notNull()
    .references(() => gamePlayers.id, { onDelete: "cascade" }),
  columnType: columnTypeEnum.notNull(),
  najavaRowKey: najavaRowKeyEnum,
  rollCount: tinyint("roll_count").notNull().default(0),
  dice: json("dice").$type<number[]>().notNull(),
  heldDice: json("held_dice").$type<boolean[]>().notNull(),
  status: turnStatusEnum.notNull().default("ACTIVE"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const rollEvents = mysqlTable(
  "roll_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    turnId: varchar("turn_id", { length: 36 })
      .notNull()
      .references(() => turns.id, { onDelete: "cascade" }),
    rollNumber: tinyint("roll_number").notNull(),
    dice: json("dice").$type<number[]>().notNull(),
    heldBefore: json("held_before").$type<boolean[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_roll_events").on(table.turnId, table.rollNumber),
  ]
);

export const playerStats = mysqlTable("player_stats", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  gamesPlayed: int("games_played").notNull().default(0),
  gamesWon: int("games_won").notNull().default(0),
  gamesLost: int("games_lost").notNull().default(0),
  totalScore: int("total_score").notNull().default(0),
  averageScore: int("average_score").notNull().default(0),
  bestScore: int("best_score"),
  worstScore: int("worst_score"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playerCombinationStats = mysqlTable(
  "player_combination_stats",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    combination: combinationEnum.notNull(),
    countSuccess: int("count_success").notNull().default(0),
    countFailed: int("count_failed").notNull().default(0),
  },
  (table) => [
    uniqueIndex("uq_player_combo").on(table.userId, table.combination),
  ]
);

export const opponentStats = mysqlTable(
  "opponent_stats",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    opponentId: varchar("opponent_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchesPlayed: int("matches_played").notNull().default(0),
    wins: int("wins").notNull().default(0),
    losses: int("losses").notNull().default(0),
    draws: int("draws").notNull().default(0),
    totalMyScore: int("total_my_score").notNull().default(0),
    totalOpponentScore: int("total_opponent_score").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_opponent_stats").on(table.userId, table.opponentId),
  ]
);

export const leagues = mysqlTable("leagues", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  season: varchar("season", { length: 50 }).notNull(),
  description: varchar("description", { length: 2000 }),
  status: mysqlEnum("status", ["ACTIVE", "FINISHED", "ARCHIVED"])
    .notNull()
    .default("ACTIVE"),
  inviteCode: varchar("invite_code", { length: 8 }).notNull().unique(),
  isPublic: boolean("is_public").notNull().default(true),
  maxMembers: tinyint("max_members").notNull().default(50),
  imageUrl: varchar("image_url", { length: 500 }),
  createdBy: varchar("created_by", { length: 36 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"),
});

export const leagueMembers = mysqlTable(
  "league_members",
  {
    leagueId: varchar("league_id", { length: 36 })
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["OWNER", "ADMIN", "MEMBER"])
      .notNull()
      .default("MEMBER"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_league_member").on(table.leagueId, table.userId),
  ]
);

export const leagueMatches = mysqlTable(
  "league_matches",
  {
    leagueId: varchar("league_id", { length: 36 })
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    gameId: varchar("game_id", { length: 36 })
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_league_match").on(table.leagueId, table.gameId),
    uniqueIndex("uq_league_game").on(table.gameId),
  ]
);

export const leagueNotifications = mysqlTable("league_notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  leagueId: varchar("league_id", { length: 36 })
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  actorUserId: varchar("actor_user_id", { length: 36 }).references(
    () => users.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type ScoreEntryRow = typeof scoreEntries.$inferSelect;
export type TurnRow = typeof turns.$inferSelect;
export type RollEventRow = typeof rollEvents.$inferSelect;
