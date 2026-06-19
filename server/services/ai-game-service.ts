import { getDb, schema } from "@/server/db";
import { ApiError } from "@/server/lib/api-error";
import { newId, roomCode } from "@/server/lib/id";
import {
  aiChooseMove,
  aiChooseDirectMove,
  aiMoveLabel,
  AI_BOT_DISPLAY_NAME,
  isAiDisplayName,
  type AiDifficulty,
} from "@/lib/yamb/ai-player";
import { calculateAutoScore } from "@/lib/yamb/combinations";
import { createGuestUser as createGuestUserAccount } from "./auth-service";
import {
  assertPlayerInGame,
  directPlay,
  getGameState,
  loadPlayerEngineState,
  rollDice,
  setNajava,
  startPlayerTurn,
  submitTurnScore,
  toggleHold,
} from "./game-service";
import { bumpGameStateVersion } from "./stats-service";

export { AI_BOT_DISPLAY_NAME, isAiDisplayName };

export async function createGameVsAi(hostUserId: string) {
  const bot = await createGuestUserAccount(AI_BOT_DISPLAY_NAME);
  const db = getDb();
  const gameId = newId();
  const code = roomCode();

  await db.insert(schema.games).values({
    id: gameId,
    roomCode: code,
    hostUserId,
    status: "IN_PROGRESS",
    maxPlayers: 6,
    currentPlayerIndex: 0,
    diceMode: "VIRTUAL",
    startedAt: new Date(),
  });

  await db.insert(schema.gamePlayers).values([
    {
      id: newId(),
      gameId,
      userId: hostUserId,
      seatOrder: 0,
    },
    {
      id: newId(),
      gameId,
      userId: bot.id,
      seatOrder: 1,
    },
  ]);

  await bumpGameStateVersion(gameId);

  return { gameId, roomCode: code, aiUserId: bot.id };
}

export async function runAiStep(
  gameId: string,
  requestingUserId: string,
  difficulty: AiDifficulty = "medium"
) {
  await assertPlayerInGame(gameId, requestingUserId);

  const state = await getGameState(gameId);
  if (state.game.status !== "IN_PROGRESS") {
    throw new ApiError(400, "GAME_NOT_IN_PROGRESS", "Partija nije u toku");
  }

  const current = state.currentPlayer;
  if (!current?.isAi) {
    return { skipped: true as const, reason: "NOT_AI_TURN" as const };
  }

  const aiUserId = current.userId;
  const engine = await loadPlayerEngineState(gameId, current.gamePlayerId);

  if (
    state.directedPlay &&
    current.gamePlayerId === state.directedPlay.executorGamePlayerId
  ) {
    const move = aiChooseMove(engine, difficulty, undefined, state.directedPlay);
    return executeAiMove(gameId, aiUserId, engine, move);
  }

  if (!state.activeTurn && !state.directedPlay) {
    const directMove = aiChooseDirectMove(engine, difficulty);
    if (directMove) {
      await directPlay(gameId, aiUserId, directMove.rowKey);
      return {
        skipped: false as const,
        action: "direct" as const,
        actionLabel: aiMoveLabel({ type: "direct", rowKey: directMove.rowKey }),
      };
    }
  }

  const move = aiChooseMove(engine, difficulty);
  return executeAiMove(gameId, aiUserId, engine, move);
}

async function executeAiMove(
  gameId: string,
  aiUserId: string,
  engine: Awaited<ReturnType<typeof loadPlayerEngineState>>,
  move: ReturnType<typeof aiChooseMove>
) {
  switch (move.type) {
    case "start_turn":
      await startPlayerTurn(gameId, aiUserId, move.columnType);
      break;
    case "najava":
      await setNajava(gameId, aiUserId, move.rowKey);
      break;
    case "roll":
      await rollDice(gameId, aiUserId);
      break;
    case "toggle_hold":
      await toggleHold(gameId, aiUserId, move.index);
      break;
    case "submit": {
      const turn = engine.activeTurn;
      const score =
        move.score ??
        (turn && move.isManual
          ? calculateAutoScore(move.rowKey, turn.dice)
          : undefined);
      await submitTurnScore(gameId, aiUserId, {
        rowKey: move.rowKey,
        columnType: move.columnType,
        score,
        isManual: move.isManual,
      });
      break;
    }
  }

  return {
    skipped: false as const,
    action: move.type,
    actionLabel: aiMoveLabel(move),
  };
}
