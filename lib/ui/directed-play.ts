import type { GameState, PlayerScorecard } from "@/lib/api/types";
import type { ColumnState } from "@/lib/yamb/types";
import { ERROR_MESSAGES } from "@/lib/yamb/constants";

export const DIRECTED_ROW_MISMATCH_MESSAGE =
  ERROR_MESSAGES.DIRECTED_ROW_MISMATCH;

export function getNextPlayerScorecard(
  state: GameState,
  currentGamePlayerId: string
): PlayerScorecard | undefined {
  const idx = state.players.findIndex(
    (p) => p.gamePlayerId === currentGamePlayerId
  );
  if (idx === -1) return undefined;
  const nextIdx = (idx + 1) % state.players.length;
  const nextId = state.players[nextIdx]?.gamePlayerId;
  return state.scorecards.find((s) => s.gamePlayerId === nextId);
}

export function getNextPlayerColumns(
  state: GameState,
  currentGamePlayerId: string
): ColumnState[] | null {
  return getNextPlayerScorecard(state, currentGamePlayerId)?.columns ?? null;
}
