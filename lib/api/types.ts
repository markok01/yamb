import type {
  ColumnState,
  ColumnTotals,
  Dice,
  DiceMode,
  FillableRowKey,
  HeldDice,
  TurnState,
} from "@/lib/yamb/types";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isGuest?: boolean;
}

export interface GameInfo {
  id: string;
  roomCode: string;
  status: "LOBBY" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  currentPlayerIndex: number | null;
  hostUserId: string;
  diceMode: DiceMode;
  stateVersion: number;
  leagueId: string | null;
  /** Polje koje sledeći igrač mora odigrati u koloni D posle najave */
  directedRowKey: FillableRowKey | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface DirectedPlay {
  rowKey: FillableRowKey;
  directorGamePlayerId: string;
  directorDisplayName: string;
  executorGamePlayerId: string;
}

export interface PlayerInfo {
  gamePlayerId: string;
  userId: string;
  displayName: string;
  seatOrder: number;
  isAi?: boolean;
}

export interface PlayerScorecard {
  gamePlayerId: string;
  userId: string;
  displayName: string;
  seatOrder: number;
  columns: Array<ColumnState & { totals: ColumnTotals }>;
  finalScore: number;
}

export interface ActiveTurn {
  turnId: string;
  gamePlayerId: string;
  turn: TurnState;
  dojavaSuggestion: { rowKey: FillableRowKey; score: number } | null;
}

export interface LeaderboardEntry {
  gamePlayerId: string;
  userId: string;
  displayName: string;
  seatOrder: number;
  finalScore: number;
  placement: number;
}

export interface GameState {
  game: GameInfo;
  players: PlayerInfo[];
  scorecards: PlayerScorecard[];
  currentPlayer: PlayerInfo | null;
  activeTurn: ActiveTurn | null;
  leaderboard: LeaderboardEntry[];
  directedPlay: DirectedPlay | null;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}

export type DiceState = {
  dice: Dice;
  heldDice: HeldDice;
  rollCount: number;
  currentRollHistory: Dice[];
};

export interface UserStatsResponse {
  stats: {
    userId: string;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    totalScore: number;
    averageScore: number;
    bestScore: number | null;
    worstScore: number | null;
    updatedAt: Date | string;
  };
  winRate: number;
  jambCombinationsTotal: number;
  combinations: Array<{
    userId: string;
    combination: string;
    countSuccess: number;
    countFailed: number;
  }>;
  recentGames: Array<{
    gameId: string;
    roomCode: string;
    diceMode: DiceMode;
    finalScore: number | null;
    placement: number | null;
    finishedAt: Date | string | null;
  }>;
}

export type GameResult = "win" | "loss" | "draw";

export interface GameHistoryEntry {
  gameId: string;
  roomCode: string;
  diceMode: DiceMode;
  finishedAt: Date | string | null;
  winnerUserId: string | null;
  myScore: number | null;
  myPlacement: number | null;
  result: GameResult;
  opponents: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    finalScore: number | null;
    placement: number | null;
  }>;
  players: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    finalScore: number | null;
    placement: number | null;
  }>;
}

export interface OpponentHistoryEntry {
  opponentId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  averageMyScore: number;
  averageOpponentScore: number;
}

export interface GameHistoryResponse {
  games: GameHistoryEntry[];
  total: number;
}

export interface UserHistoryResponse extends GameHistoryResponse {
  opponents: OpponentHistoryEntry[];
}

export interface GameHistoryDetailResponse {
  game: {
    id: string;
    roomCode: string;
    diceMode: DiceMode;
    status: string;
    winnerUserId: string | null;
    startedAt: Date | string | null;
    finishedAt: Date | string | null;
  };
  myResult: GameResult;
  players: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    finalScore: number | null;
    placement: number | null;
    seatOrder: number;
  }>;
}

export interface LeagueInfo {
  id: string;
  name: string;
  season: string;
  description: string | null;
  status: "ACTIVE" | "FINISHED" | "ARCHIVED";
  inviteCode: string;
  isPublic: boolean;
  maxMembers: number;
  imageUrl: string | null;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  archivedAt: Date | string | null;
  isMember: boolean;
  myRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  ownerUserId: string;
  ownerName: string | null;
  memberCount: number;
  members: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    username: string;
    joinedAt: Date | string;
    role: "OWNER" | "ADMIN" | "MEMBER";
  }>;
  matches: Array<{
    gameId: string;
    roomCode: string;
    finishedAt: Date | string | null;
    startedAt?: Date | string | null;
    winnerUserId: string | null;
    addedAt?: Date | string;
  }>;
}

export interface LeagueListItem {
  id: string;
  name: string;
  season: string;
  description: string | null;
  status: "ACTIVE" | "FINISHED" | "ARCHIVED";
  inviteCode: string;
  isPublic: boolean;
  maxMembers: number;
  imageUrl: string | null;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  archivedAt: Date | string | null;
  myRole: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
}

export interface LeagueStanding {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number;
  bestScore: number;
  pointDiff: number;
}

export interface LeagueStandingsResponse {
  leagueId: string;
  name: string;
  season: string;
  status: string;
  standings: LeagueStanding[];
}

export interface LeagueMatchHistoryItem {
  gameId: string;
  roomCode: string;
  finishedAt: Date | string | null;
  startedAt: Date | string | null;
  durationMs: number | null;
  diceMode: string;
  winnerUserId: string | null;
  winnerName: string | null;
  players: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    finalScore: number | null;
    placement: number | null;
  }>;
}

export interface LeagueStatsResponse {
  leagueId: string;
  leagueName?: string;
  totalMatches: number;
  averageScore: number;
  highestScoreEver: number;
  mostWins: LeagueStanding | null;
  comboCounts: Record<string, number>;
  scoreTimeline: Array<{ date: string; averageScore: number }>;
  topPlayers: LeagueStanding[];
  playerForm: Array<{
    userId: string;
    displayName: string;
    recentScores: number[];
  }>;
}

export interface LeagueHeadToHeadResponse {
  userA: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    username: string;
    wins: number;
    losses: number;
    draws: number;
    averageScore: number;
    bestScore: number;
    biggestWin: number;
  };
  userB: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    username: string;
    wins: number;
    losses: number;
    draws: number;
    averageScore: number;
    bestScore: number;
    biggestWin: number;
  };
  matches: number;
}

export interface LeagueNotification {
  id: string;
  type: string;
  message: string;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: Date | string;
}
