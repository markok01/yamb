import type {
  Game,
  GamePlayer,
  RollEventRow,
  ScoreEntryRow,
  TurnRow,
  User,
} from "./schema";

export type PlayerStatsRow = {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalScore: number;
  averageScore: number;
  bestScore: number | null;
  worstScore: number | null;
  updatedAt: Date;
};

export type PlayerCombinationStatsRow = {
  userId: string;
  combination: "KENTA" | "TRILING" | "FUL" | "POKER" | "JAMB";
  countSuccess: number;
  countFailed: number;
};

export interface DbSnapshot {
  users: User[];
  games: Game[];
  gamePlayers: GamePlayer[];
  scoreEntries: ScoreEntryRow[];
  turns: TurnRow[];
  rollEvents: RollEventRow[];
  playerStats: PlayerStatsRow[];
  playerCombinationStats: PlayerCombinationStatsRow[];
}

export const EMPTY_DB: DbSnapshot = {
  users: [],
  games: [],
  gamePlayers: [],
  scoreEntries: [],
  turns: [],
  rollEvents: [],
  playerStats: [],
  playerCombinationStats: [],
};
