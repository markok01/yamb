import { and, asc, eq } from "drizzle-orm";
import { calculateAutoScore } from "@/lib/yamb/combinations";
import { canFillCell } from "@/lib/yamb/columns";
import {
  createEngineState,
  roll as engineRoll,
  setHold as engineSetHold,
  setNajava as engineSetNajava,
  startTurn as engineStartTurn,
  submitPhysicalScore as engineSubmitPhysicalScore,
  submitScore as engineSubmitScore,
} from "@/lib/yamb/engine";
import { isScorecardComplete } from "@/lib/yamb/columns";
import type { ColumnType, Dice, DiceMode, FillableRowKey } from "@/lib/yamb/types";
import {
  validateColumnAccess,
  validatePhysicalScore,
  validateScoreCorrection,
  validateScoreForDice,
} from "@/lib/yamb/validation";
import { getDb, schema } from "@/server/db";
import { ApiError, apiErrorFromInvalidMove } from "@/server/lib/api-error";
import { newId, roomCode } from "@/server/lib/id";
import {
  buildLeaderboard,
  buildPlayerScorecard,
  scoreEntriesToColumns,
  turnRowToState,
  type ActiveTurnDto,
  type PlayerScorecardDto,
} from "./state-mapper";
import { bumpGameStateVersion, recordGameStats } from "./stats-service";
import { recordOpponentStats } from "./history-service";
import { createGuestUser as createGuestUserAccount } from "./auth-service";
import { isAiDisplayName } from "@/lib/yamb/ai-player";
import { VIRTUAL_ROLL_PLACEHOLDER } from "@/lib/ui/virtual-roll-first";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

async function getGameOrThrow(gameId: string) {
  const db = getDb();
  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, gameId),
  });
  if (!game) {
    throw new ApiError(404, "GAME_NOT_FOUND", "Partija nije pronađena");
  }
  return game;
}

async function getGamePlayers(gameId: string) {
  const db = getDb();
  return db
    .select({
      player: schema.gamePlayers,
      user: schema.users,
    })
    .from(schema.gamePlayers)
    .innerJoin(schema.users, eq(schema.gamePlayers.userId, schema.users.id))
    .where(eq(schema.gamePlayers.gameId, gameId))
    .orderBy(asc(schema.gamePlayers.seatOrder));
}

async function getPlayerInGame(gameId: string, userId: string) {
  const db = getDb();
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

async function getScoreRowsForPlayer(gamePlayerId: string) {
  const db = getDb();
  return db.query.scoreEntries.findMany({
    where: eq(schema.scoreEntries.gamePlayerId, gamePlayerId),
  });
}

async function getActiveTurnRow(gameId: string) {
  const db = getDb();
  return db.query.turns.findFirst({
    where: and(
      eq(schema.turns.gameId, gameId),
      eq(schema.turns.status, "ACTIVE")
    ),
  });
}

async function loadEngineForPlayer(gamePlayerId: string) {
  const rows = await getScoreRowsForPlayer(gamePlayerId);
  const columns = scoreEntriesToColumns(rows);
  return createEngineState(columns);
}

export async function loadPlayerEngineState(
  gameId: string,
  gamePlayerId: string
) {
  const engine = await loadEngineForPlayer(gamePlayerId);
  const turnRow = await getActiveTurnRow(gameId);
  if (turnRow?.gamePlayerId === gamePlayerId) {
    const rollEvents = await getRollEvents(turnRow.id);
    engine.activeTurn = turnRowToState(turnRow, rollEvents);
  }
  return engine;
}

export async function assertPlayerInGame(gameId: string, userId: string) {
  const player = await getPlayerInGame(gameId, userId);
  if (!player) {
    throw new ApiError(403, "NOT_IN_GAME", "Niste u ovoj partiji");
  }
  return player;
}

async function assertCurrentPlayer(gameId: string, userId: string) {
  const game = await getGameOrThrow(gameId);
  if (game.status !== "IN_PROGRESS") {
    throw new ApiError(400, "GAME_NOT_IN_PROGRESS", "Partija nije u toku");
  }

  const players = await getGamePlayers(gameId);
  const currentIndex = game.currentPlayerIndex ?? 0;
  const current = players[currentIndex];
  if (!current || current.player.userId !== userId) {
    throw new ApiError(403, "NOT_YOUR_TURN", "Niste na potezu");
  }

  return { game, currentPlayer: current };
}

async function advanceTurn(gameId: string, playerCount: number) {
  const db = getDb();
  const game = await getGameOrThrow(gameId);
  const nextIndex = ((game.currentPlayerIndex ?? 0) + 1) % playerCount;
  await db
    .update(schema.games)
    .set({ currentPlayerIndex: nextIndex })
    .where(eq(schema.games.id, gameId));
}

async function finishGameIfComplete(gameId: string) {
  const players = await getGamePlayers(gameId);
  const scorecards: PlayerScorecardDto[] = [];

  for (const { player, user } of players) {
    const rows = await getScoreRowsForPlayer(player.id);
    scorecards.push(
      buildPlayerScorecard(
        player.id,
        player.userId,
        user.displayName,
        player.seatOrder,
        rows
      )
    );
  }

  const allComplete = scorecards.every((sc) => isScorecardComplete(sc.columns));

  if (!allComplete) return null;

  const leaderboard = buildLeaderboard(scorecards);
  const winner = leaderboard[0];
  const db = getDb();

  await db
    .update(schema.games)
    .set({
      status: "FINISHED",
      finishedAt: new Date(),
      winnerUserId: winner?.userId ?? null,
    })
    .where(eq(schema.games.id, gameId));

  for (const entry of leaderboard) {
    await db
      .update(schema.gamePlayers)
      .set({
        finalScore: entry.finalScore,
        placement: entry.placement,
      })
      .where(eq(schema.gamePlayers.id, entry.gamePlayerId));
  }

  const statsPayload = await Promise.all(
    players.map(async ({ player, user }) => {
      const scoreRows = await getScoreRowsForPlayer(player.id);
      const sc = buildPlayerScorecard(
        player.id,
        player.userId,
        user.displayName,
        player.seatOrder,
        scoreRows
      );
      return {
        userId: player.userId,
        finalScore: sc.finalScore,
        scoreRows,
      };
    })
  );

  await recordGameStats(winner?.userId ?? null, statsPayload);
  await recordOpponentStats(gameId, leaderboard, winner?.userId ?? null);
  await bumpGameStateVersion(gameId);

  return leaderboard;
}

export async function createGuestUser(displayName: string) {
  return createGuestUserAccount(displayName);
}

export async function createGame(hostUserId: string, diceMode: DiceMode = "VIRTUAL") {
  const db = getDb();
  const gameId = newId();
  const code = roomCode();

  await db.insert(schema.games).values({
    id: gameId,
    roomCode: code,
    hostUserId,
    status: "LOBBY",
    maxPlayers: MAX_PLAYERS,
    currentPlayerIndex: 0,
    diceMode,
  });

  const playerId = newId();
  await db.insert(schema.gamePlayers).values({
    id: playerId,
    gameId,
    userId: hostUserId,
    seatOrder: 0,
  });

  return { gameId, roomCode: code, diceMode };
}

export async function joinGame(roomCodeValue: string, userId: string) {
  const db = getDb();
  const game = await db.query.games.findFirst({
    where: eq(schema.games.roomCode, roomCodeValue.toUpperCase()),
  });

  if (!game) {
    throw new ApiError(404, "GAME_NOT_FOUND", "Soba nije pronađena");
  }
  if (game.status !== "LOBBY") {
    throw new ApiError(400, "GAME_ALREADY_STARTED", "Partija je već počela");
  }

  const existing = await getPlayerInGame(game.id, userId);
  if (existing) {
    return { gameId: game.id, roomCode: game.roomCode };
  }

  const players = await getGamePlayers(game.id);
  if (players.length >= MAX_PLAYERS) {
    throw new ApiError(400, "GAME_FULL", "Soba je puna");
  }

  await db.insert(schema.gamePlayers).values({
    id: newId(),
    gameId: game.id,
    userId,
    seatOrder: players.length,
  });

  return { gameId: game.id, roomCode: game.roomCode };
}

export async function startGame(gameId: string, hostUserId: string) {
  const game = await getGameOrThrow(gameId);
  if (game.hostUserId !== hostUserId) {
    throw new ApiError(403, "NOT_HOST", "Samo domaćin može da startuje partiju");
  }
  if (game.status !== "LOBBY") {
    throw new ApiError(400, "GAME_ALREADY_STARTED", "Partija je već startovana");
  }

  const players = await getGamePlayers(gameId);
  const minPlayers = game.diceMode === "PHYSICAL" ? 1 : MIN_PLAYERS;
  if (players.length < minPlayers) {
    throw new ApiError(
      400,
      "NOT_ENOUGH_PLAYERS",
      game.diceMode === "PHYSICAL"
        ? "Potreban je minimum 1 igrač"
        : "Potrebna su minimum 2 igrača"
    );
  }

  const db = getDb();
  await db
    .update(schema.games)
    .set({
      status: "IN_PROGRESS",
      startedAt: new Date(),
      currentPlayerIndex: 0,
    })
    .where(eq(schema.games.id, gameId));

  await bumpGameStateVersion(gameId);

  return { gameId, playerCount: players.length };
}

export async function getGameState(gameId: string) {
  const game = await getGameOrThrow(gameId);
  const players = await getGamePlayers(gameId);
  const scorecards: PlayerScorecardDto[] = [];

  for (const { player, user } of players) {
    const rows = await getScoreRowsForPlayer(player.id);
    scorecards.push(
      buildPlayerScorecard(
        player.id,
        player.userId,
        user.displayName,
        player.seatOrder,
        rows
      )
    );
  }

  const activeTurn = await buildActiveTurnDto(gameId);
  const leaderboard = buildLeaderboard(scorecards);
  const currentPlayer =
    game.status === "IN_PROGRESS"
      ? players[game.currentPlayerIndex ?? 0] ?? null
      : null;

  let directedPlay: {
    rowKey: FillableRowKey;
    directorGamePlayerId: string;
    directorDisplayName: string;
  } | null = null;
  if (game.directedRowKey && game.directorGamePlayerId) {
    const director = players.find(
      (p) => p.player.id === game.directorGamePlayerId
    );
    if (director) {
      directedPlay = {
        rowKey: game.directedRowKey as FillableRowKey,
        directorGamePlayerId: game.directorGamePlayerId,
        directorDisplayName: director.user.displayName,
      };
    }
  }

  return {
    game: {
      id: game.id,
      roomCode: game.roomCode,
      status: game.status,
      currentPlayerIndex: game.currentPlayerIndex,
      hostUserId: game.hostUserId,
      diceMode: game.diceMode as DiceMode,
      stateVersion: game.stateVersion,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
    },
    players: scorecards.map((sc) => ({
      gamePlayerId: sc.gamePlayerId,
      userId: sc.userId,
      displayName: sc.displayName,
      seatOrder: sc.seatOrder,
      isAi: isAiDisplayName(sc.displayName),
    })),
    scorecards,
    currentPlayer: currentPlayer
      ? {
          gamePlayerId: currentPlayer.player.id,
          userId: currentPlayer.player.userId,
          displayName: currentPlayer.user.displayName,
          seatOrder: currentPlayer.player.seatOrder,
          isAi: isAiDisplayName(currentPlayer.user.displayName),
        }
      : null,
    activeTurn,
    leaderboard,
    directedPlay,
  };
}

async function buildActiveTurnDto(gameId: string): Promise<ActiveTurnDto | null> {
  const turnRow = await getActiveTurnRow(gameId);
  if (!turnRow) return null;

  const db = getDb();
  const rollEvents = await db.query.rollEvents.findMany({
    where: eq(schema.rollEvents.turnId, turnRow.id),
  });

  const turn = turnRowToState(turnRow, rollEvents);
  const engine = await loadEngineForPlayer(turnRow.gamePlayerId);
  engine.activeTurn = turn;

  return {
    turnId: turnRow.id,
    gamePlayerId: turnRow.gamePlayerId,
    turn,
    dojavaSuggestion: null,
  };
}

async function assertVirtualDiceMode(gameId: string) {
  const game = await getGameOrThrow(gameId);
  if (game.diceMode === "PHYSICAL") {
    throw new ApiError(
      400,
      "PHYSICAL_MODE",
      "Ova akcija nije dostupna u režimu fizičkih kockica"
    );
  }
  return game;
}

export async function startPlayerTurn(
  gameId: string,
  userId: string,
  columnType: ColumnType
) {
  const { currentPlayer } = await assertCurrentPlayer(gameId, userId);

  const existing = await getActiveTurnRow(gameId);
  if (existing) {
    throw new ApiError(400, "TURN_IN_PROGRESS", "Ne može novi potez dok se ne završi trenutni");
  }

  if (columnType === "DOJAVA") {
    throw apiErrorFromInvalidMove(
      "Kolona Dirigovana: klikni prazno polje u koloni D da najaviš sledećem igraču"
    );
  }

  const engine = await loadEngineForPlayer(currentPlayer.player.id);
  const { state, result } = engineStartTurn(engine, columnType);
  if (!result.valid) {
    throw apiErrorFromInvalidMove(result.message);
  }

  const turnId = newId();
  const db = getDb();
  await db.insert(schema.turns).values({
    id: turnId,
    gameId,
    gamePlayerId: currentPlayer.player.id,
    columnType,
    rollCount: 0,
    dice: [0, 0, 0, 0, 0],
    heldDice: [false, false, false, false, false],
    status: "ACTIVE",
  });

  await bumpGameStateVersion(gameId);

  return {
    turnId,
    columnType,
    turn: state.activeTurn,
  };
}

export async function setNajava(
  gameId: string,
  userId: string,
  rowKey: FillableRowKey
) {
  const { currentPlayer } = await assertCurrentPlayer(gameId, userId);
  const turnRow = await getActiveTurnRow(gameId);
  if (!turnRow || turnRow.gamePlayerId !== currentPlayer.player.id) {
    throw new ApiError(400, "NO_ACTIVE_TURN", "Nema aktivnog poteza");
  }

  const engine = await loadEngineForPlayer(currentPlayer.player.id);
  const rollEvents = await getRollEvents(turnRow.id);
  engine.activeTurn = turnRowToState(turnRow, rollEvents);

  const { state, result } = engineSetNajava(engine, rowKey);
  if (!result.valid) {
    throw apiErrorFromInvalidMove(result.message);
  }

  const db = getDb();
  await db
    .update(schema.turns)
    .set({ najavaRowKey: rowKey })
    .where(eq(schema.turns.id, turnRow.id));

  await bumpGameStateVersion(gameId);

  return { najavaRowKey: rowKey, turn: state.activeTurn };
}

async function getRollEvents(turnId: string) {
  const db = getDb();
  return db.query.rollEvents.findMany({
    where: eq(schema.rollEvents.turnId, turnId),
  });
}

export async function rollDice(gameId: string, userId: string) {
  await assertVirtualDiceMode(gameId);
  const { currentPlayer } = await assertCurrentPlayer(gameId, userId);
  let turnRow = await getActiveTurnRow(gameId);

  if (!turnRow) {
    await startPlayerTurn(gameId, userId, VIRTUAL_ROLL_PLACEHOLDER);
    turnRow = await getActiveTurnRow(gameId);
  }

  if (!turnRow || turnRow.gamePlayerId !== currentPlayer.player.id) {
    throw new ApiError(400, "NO_ACTIVE_TURN", "Nema aktivnog poteza");
  }

  const engine = await loadEngineForPlayer(currentPlayer.player.id);
  const rollEvents = await getRollEvents(turnRow.id);
  engine.activeTurn = turnRowToState(turnRow, rollEvents);

  const heldBefore = [...engine.activeTurn!.heldDice];
  const { state, result, dice } = engineRoll(engine);
  if (!result.valid) {
    throw apiErrorFromInvalidMove(result.message);
  }

  const turn = state.activeTurn!;
  const db = getDb();

  await db
    .update(schema.turns)
    .set({
      rollCount: turn.rollCount,
      dice: [...turn.dice],
      heldDice: [...turn.heldDice],
    })
    .where(eq(schema.turns.id, turnRow.id));

  await db.insert(schema.rollEvents).values({
    id: newId(),
    turnId: turnRow.id,
    rollNumber: turn.rollCount,
    dice: [...turn.dice],
    heldBefore,
  });

  await bumpGameStateVersion(gameId);

  return {
    turnId: turnRow.id,
    rollNumber: turn.rollCount,
    dice,
    turn,
    dojavaSuggestion: null,
  };
}

export async function toggleHold(gameId: string, userId: string, index: number) {
  await assertVirtualDiceMode(gameId);
  const { currentPlayer } = await assertCurrentPlayer(gameId, userId);
  const turnRow = await getActiveTurnRow(gameId);
  if (!turnRow || turnRow.gamePlayerId !== currentPlayer.player.id) {
    throw new ApiError(400, "NO_ACTIVE_TURN", "Nema aktivnog poteza");
  }

  const engine = await loadEngineForPlayer(currentPlayer.player.id);
  const rollEvents = await getRollEvents(turnRow.id);
  engine.activeTurn = turnRowToState(turnRow, rollEvents);

  const { state, result } = engineSetHold(engine, index);
  if (!result.valid) {
    throw apiErrorFromInvalidMove(result.message);
  }

  const turn = state.activeTurn!;
  const db = getDb();
  await db
    .update(schema.turns)
    .set({ heldDice: [...turn.heldDice] })
    .where(eq(schema.turns.id, turnRow.id));

  await bumpGameStateVersion(gameId);

  return { heldDice: turn.heldDice };
}

export async function directPlay(
  gameId: string,
  userId: string,
  rowKey: FillableRowKey
) {
  const { game, currentPlayer } = await assertCurrentPlayer(gameId, userId);

  if (game.directedRowKey) {
    throw new ApiError(
      400,
      "DIRECTED_PLAY_PENDING",
      "Prvo završi dirigovani potez pre nove dirige"
    );
  }

  const engine = await loadEngineForPlayer(currentPlayer.player.id);
  const column = engine.columns.find((c) => c.columnType === "DOJAVA");
  if (!column) {
    throw new ApiError(500, "INTERNAL_ERROR", "Kolona Dirigovana nije pronađena");
  }

  if (!canFillCell(column, rowKey)) {
    throw apiErrorFromInvalidMove("Polje u koloni Dirigovana nije dostupno");
  }

  const accessCheck = validateColumnAccess(column, engine.columns, rowKey);
  if (!accessCheck.valid) {
    throw apiErrorFromInvalidMove(accessCheck.message);
  }

  const existing = await getActiveTurnRow(gameId);
  const db = getDb();
  if (existing && existing.gamePlayerId === currentPlayer.player.id) {
    await db
      .update(schema.turns)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(schema.turns.id, existing.id));
  } else if (existing) {
    throw new ApiError(400, "TURN_IN_PROGRESS", "Ne može dirige dok traje tuđ potez");
  }

  await db
    .update(schema.games)
    .set({
      directedRowKey: rowKey,
      directorGamePlayerId: currentPlayer.player.id,
    })
    .where(eq(schema.games.id, gameId));

  const players = await getGamePlayers(gameId);
  await advanceTurn(gameId, players.length);
  await bumpGameStateVersion(gameId);

  return {
    rowKey,
    directorGamePlayerId: currentPlayer.player.id,
  };
}

export interface SubmitScoreInput {
  rowKey: FillableRowKey;
  columnType?: ColumnType;
  score?: number;
  isManual?: boolean;
  dojavaAccepted?: boolean;
  overrideRowKey?: FillableRowKey;
}

export async function submitTurnScore(
  gameId: string,
  userId: string,
  input: SubmitScoreInput
) {
  await assertVirtualDiceMode(gameId);
  const { currentPlayer } = await assertCurrentPlayer(gameId, userId);
  const game = await getGameOrThrow(gameId);

  if (game.directedRowKey && game.directorGamePlayerId) {
    return submitDirectedTurnScore(gameId, game, currentPlayer.player.id, userId, input);
  }

  const turnRow = await getActiveTurnRow(gameId);
  if (!turnRow || turnRow.gamePlayerId !== currentPlayer.player.id) {
    throw new ApiError(400, "NO_ACTIVE_TURN", "Nema aktivnog poteza");
  }

  const engine = await loadEngineForPlayer(currentPlayer.player.id);
  const rollEvents = await getRollEvents(turnRow.id);
  engine.activeTurn = turnRowToState(turnRow, rollEvents);

  let scoreColumnType = turnRow.columnType as ColumnType;

  if (scoreColumnType === VIRTUAL_ROLL_PLACEHOLDER) {
    if (!input.columnType) {
      throw new ApiError(
        400,
        "COLUMN_REQUIRED",
        "Izaberi kolonu za upis rezultata"
      );
    }
    if (input.columnType === "NAJAVA") {
      throw apiErrorFromInvalidMove(
        "Kolona NAJAVA zahteva najavu pre prvog bacanja"
      );
    }
    scoreColumnType = input.columnType;

    const db = getDb();
    await db
      .update(schema.turns)
      .set({ columnType: scoreColumnType })
      .where(eq(schema.turns.id, turnRow.id));

    engine.activeTurn!.columnType = scoreColumnType;
  } else if (input.columnType && input.columnType !== scoreColumnType) {
    throw apiErrorFromInvalidMove("Upis mora biti u aktivnoj koloni poteza");
  }

  if (scoreColumnType === "DOJAVA" || input.columnType === "DOJAVA") {
    throw apiErrorFromInvalidMove(
      "Kolona Dirigovana se koristi preko dirigovanja sledećem igraču"
    );
  }

  const { result, entry } = engineSubmitScore(engine, input.rowKey, {
    score: input.score,
    isManual: input.isManual,
    dojavaAccepted: input.dojavaAccepted,
    overrideRowKey: input.overrideRowKey,
  });

  if (!result.valid) {
    throw apiErrorFromInvalidMove(result.message);
  }
  if (!entry) {
    throw new ApiError(500, "INTERNAL_ERROR", "Upis nije kreiran");
  }

  const db = getDb();
  await db.insert(schema.scoreEntries).values({
    id: newId(),
    gamePlayerId: currentPlayer.player.id,
    columnType: scoreColumnType,
    rowKey: entry.rowKey,
    score: entry.score,
    diceSnapshot: [...entry.dice],
    isManual: entry.isManual ?? false,
    isNajava: entry.isNajava ?? false,
    dojavaAccepted: entry.dojavaAccepted ?? null,
  });

  await db
    .update(schema.turns)
    .set({ status: "COMPLETED", completedAt: new Date() })
    .where(eq(schema.turns.id, turnRow.id));

  const players = await getGamePlayers(gameId);
  await advanceTurn(gameId, players.length);
  await bumpGameStateVersion(gameId);
  const finalLeaderboard = await finishGameIfComplete(gameId);

  return {
    entry,
    gameFinished: finalLeaderboard !== null,
    leaderboard: finalLeaderboard ?? undefined,
  };
}

async function submitDirectedTurnScore(
  gameId: string,
  game: Awaited<ReturnType<typeof getGameOrThrow>>,
  executorGamePlayerId: string,
  userId: string,
  input: SubmitScoreInput
) {
  if (game.directorGamePlayerId === executorGamePlayerId) {
    throw new ApiError(
      400,
      "CANNOT_EXECUTE_OWN_DIRECTIVE",
      "Ne možeš izvršiti sopstvenu dirigu"
    );
  }

  if (input.rowKey !== game.directedRowKey) {
    throw apiErrorFromInvalidMove(
      `Moraš igrati ${game.directedRowKey} u koloni Dirigovana (D)`
    );
  }

  if (input.columnType && input.columnType !== "DOJAVA") {
    throw apiErrorFromInvalidMove(
      "Dirigovani potez mora biti upisan u kolonu Dirigovana (D)"
    );
  }

  const turnRow = await getActiveTurnRow(gameId);
  if (!turnRow || turnRow.gamePlayerId !== executorGamePlayerId) {
    throw new ApiError(400, "NO_ACTIVE_TURN", "Nema aktivnog poteza");
  }

  const engine = await loadEngineForPlayer(executorGamePlayerId);
  const rollEvents = await getRollEvents(turnRow.id);
  engine.activeTurn = turnRowToState(turnRow, rollEvents);

  if (!engine.activeTurn || engine.activeTurn.rollCount === 0) {
    throw apiErrorFromInvalidMove("Prvo baci kockice pre upisa");
  }

  const dice = engine.activeTurn.dice;
  const directedRow = game.directedRowKey as FillableRowKey;
  const score = input.score ?? calculateAutoScore(directedRow, dice);

  const scoreCheck = validateScoreForDice(
    directedRow,
    dice,
    score,
    "DOJAVA"
  );
  if (!scoreCheck.valid) {
    throw apiErrorFromInvalidMove(scoreCheck.message);
  }

  const directorEngine = await loadEngineForPlayer(game.directorGamePlayerId!);
  const directorColumn = directorEngine.columns.find(
    (c) => c.columnType === "DOJAVA"
  );
  if (!directorColumn || !canFillCell(directorColumn, directedRow)) {
    throw apiErrorFromInvalidMove("Polje u koloni Dirigovana više nije dostupno");
  }

  const db = getDb();
  await db.insert(schema.scoreEntries).values({
    id: newId(),
    gamePlayerId: game.directorGamePlayerId!,
    columnType: "DOJAVA",
    rowKey: directedRow,
    score,
    diceSnapshot: [...dice],
    isManual: false,
    isNajava: false,
    dojavaAccepted: null,
  });

  await db
    .update(schema.games)
    .set({
      directedRowKey: null,
      directorGamePlayerId: null,
    })
    .where(eq(schema.games.id, gameId));

  await db
    .update(schema.turns)
    .set({ status: "COMPLETED", completedAt: new Date() })
    .where(eq(schema.turns.id, turnRow.id));

  const players = await getGamePlayers(gameId);
  await advanceTurn(gameId, players.length);
  await bumpGameStateVersion(gameId);
  const finalLeaderboard = await finishGameIfComplete(gameId);

  return {
    entry: {
      rowKey: directedRow,
      score,
      dice,
      isManual: false,
      isNajava: false,
      dojavaAccepted: null,
    },
    gameFinished: finalLeaderboard !== null,
    leaderboard: finalLeaderboard ?? undefined,
  };
}

async function submitDirectedPhysicalScore(
  gameId: string,
  game: Awaited<ReturnType<typeof getGameOrThrow>>,
  executorGamePlayerId: string,
  input: SubmitPhysicalInput
) {
  if (game.directorGamePlayerId === executorGamePlayerId) {
    throw new ApiError(
      400,
      "CANNOT_EXECUTE_OWN_DIRECTIVE",
      "Ne možeš izvršiti sopstvenu dirigu"
    );
  }

  if (input.rowKey !== game.directedRowKey) {
    throw apiErrorFromInvalidMove(
      `Moraš upisati ${game.directedRowKey} u kolonu Dirigovana (D)`
    );
  }

  const directedRow = game.directedRowKey as FillableRowKey;
  const dice: Dice = input.dice
    ? (input.dice as Dice)
    : ([0, 0, 0, 0, 0] as Dice);

  const scoreCheck = validatePhysicalScore(
    directedRow,
    dice,
    input.score,
    "DOJAVA"
  );
  if (!scoreCheck.valid) {
    throw apiErrorFromInvalidMove(scoreCheck.message);
  }

  const directorEngine = await loadEngineForPlayer(game.directorGamePlayerId!);
  const directorColumn = directorEngine.columns.find(
    (c) => c.columnType === "DOJAVA"
  );
  if (!directorColumn || !canFillCell(directorColumn, directedRow)) {
    throw apiErrorFromInvalidMove("Polje u koloni Dirigovana više nije dostupno");
  }

  const db = getDb();
  await db.insert(schema.scoreEntries).values({
    id: newId(),
    gamePlayerId: game.directorGamePlayerId!,
    columnType: "DOJAVA",
    rowKey: directedRow,
    score: input.score,
    diceSnapshot: [...dice],
    isManual: true,
    isNajava: false,
    dojavaAccepted: null,
  });

  await db
    .update(schema.games)
    .set({
      directedRowKey: null,
      directorGamePlayerId: null,
    })
    .where(eq(schema.games.id, gameId));

  const activeTurn = await getActiveTurnRow(gameId);
  if (activeTurn?.gamePlayerId === executorGamePlayerId) {
    await db
      .update(schema.turns)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(schema.turns.id, activeTurn.id));
  }

  const players = await getGamePlayers(gameId);
  await advanceTurn(gameId, players.length);
  await bumpGameStateVersion(gameId);
  const finalLeaderboard = await finishGameIfComplete(gameId);

  return {
    entry: {
      rowKey: directedRow,
      score: input.score,
      dice,
      isManual: true,
      isNajava: false,
      dojavaAccepted: null,
    },
    gameFinished: finalLeaderboard !== null,
    leaderboard: finalLeaderboard ?? undefined,
  };
}

export interface SubmitPhysicalInput {
  rowKey: FillableRowKey;
  score: number;
  dice?: number[];
}

export async function submitPhysicalTurnScore(
  gameId: string,
  userId: string,
  input: SubmitPhysicalInput
) {
  const game = await getGameOrThrow(gameId);
  if (game.diceMode !== "PHYSICAL") {
    throw new ApiError(
      400,
      "VIRTUAL_MODE",
      "Ova akcija je samo za režim fizičkih kockica"
    );
  }

  const { currentPlayer } = await assertCurrentPlayer(gameId, userId);

  if (game.directedRowKey && game.directorGamePlayerId) {
    return submitDirectedPhysicalScore(
      gameId,
      game,
      currentPlayer.player.id,
      input
    );
  }

  const turnRow = await getActiveTurnRow(gameId);
  if (!turnRow || turnRow.gamePlayerId !== currentPlayer.player.id) {
    throw new ApiError(400, "NO_ACTIVE_TURN", "Nema aktivnog poteza");
  }

  const engine = await loadEngineForPlayer(currentPlayer.player.id);
  const rollEvents = await getRollEvents(turnRow.id);
  engine.activeTurn = turnRowToState(turnRow, rollEvents);

  const physicalDice = input.dice
    ? (input.dice as Dice)
    : undefined;

  const { result, entry } = engineSubmitPhysicalScore(
    engine,
    input.rowKey,
    input.score,
    physicalDice
  );

  if (!result.valid) {
    throw apiErrorFromInvalidMove(result.message);
  }
  if (!entry) {
    throw new ApiError(500, "INTERNAL_ERROR", "Upis nije kreiran");
  }

  const db = getDb();
  await db.insert(schema.scoreEntries).values({
    id: newId(),
    gamePlayerId: currentPlayer.player.id,
    columnType: turnRow.columnType,
    rowKey: entry.rowKey,
    score: entry.score,
    diceSnapshot: [...entry.dice],
    isManual: true,
    isNajava: entry.isNajava ?? false,
    dojavaAccepted: null,
  });

  await db
    .update(schema.turns)
    .set({ status: "COMPLETED", completedAt: new Date() })
    .where(eq(schema.turns.id, turnRow.id));

  const players = await getGamePlayers(gameId);
  await advanceTurn(gameId, players.length);
  await bumpGameStateVersion(gameId);
  const finalLeaderboard = await finishGameIfComplete(gameId);

  return {
    entry,
    gameFinished: finalLeaderboard !== null,
    leaderboard: finalLeaderboard ?? undefined,
  };
}

export interface CorrectScoreInput {
  columnType: ColumnType;
  rowKey: FillableRowKey;
  score: number;
}

export async function correctScoreEntry(
  gameId: string,
  userId: string,
  input: CorrectScoreInput
) {
  const game = await getGameOrThrow(gameId);
  if (game.status !== "IN_PROGRESS") {
    throw new ApiError(
      400,
      "GAME_NOT_ACTIVE",
      "Ispravka je moguća samo tokom partije"
    );
  }
  if (game.diceMode !== "PHYSICAL") {
    throw new ApiError(
      400,
      "VIRTUAL_MODE",
      "Ispravka unosa je dostupna u režimu fizičkih kockica"
    );
  }

  const player = await getPlayerInGame(gameId, userId);
  if (!player) {
    throw new ApiError(403, "NOT_IN_GAME", "Nisi u ovoj partiji");
  }

  const db = getDb();
  const existing = await db.query.scoreEntries.findFirst({
    where: and(
      eq(schema.scoreEntries.gamePlayerId, player.id),
      eq(schema.scoreEntries.columnType, input.columnType),
      eq(schema.scoreEntries.rowKey, input.rowKey)
    ),
  });

  if (!existing) {
    throw new ApiError(404, "ENTRY_NOT_FOUND", "Polje još nije popunjeno");
  }

  const dice = existing.diceSnapshot as Dice;
  const check = validateScoreCorrection(
    input.rowKey,
    input.score,
    input.columnType,
    dice,
    existing.isManual
  );

  if (!check.valid) {
    throw apiErrorFromInvalidMove(check.message);
  }

  if (existing.score !== input.score) {
    await db
      .update(schema.scoreEntries)
      .set({ score: input.score })
      .where(eq(schema.scoreEntries.id, existing.id));
    await bumpGameStateVersion(gameId);
  }

  return { columnType: input.columnType, rowKey: input.rowKey, score: input.score };
}

export async function getLeaderboard(gameId: string) {
  const game = await getGameOrThrow(gameId);
  const players = await getGamePlayers(gameId);
  const scorecards: PlayerScorecardDto[] = [];

  for (const { player, user } of players) {
    const rows = await getScoreRowsForPlayer(player.id);
    scorecards.push(
      buildPlayerScorecard(
        player.id,
        player.userId,
        user.displayName,
        player.seatOrder,
        rows
      )
    );
  }

  return {
    status: game.status,
    leaderboard: buildLeaderboard(scorecards),
  };
}
