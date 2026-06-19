import type { DirectedPlay, GameState } from "@/lib/api/types";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import { ROW_LABELS } from "@/lib/ui/labels";

/** Poruka kada executor pokuša drugo polje u koloni D. */
export const DIRECTED_ROW_MISMATCH_MESSAGE =
  "Morate odigrati isto polje koje je prethodni igrač odigrao u koloni Najava.";

export function directedRowLabel(rowKey: FillableRowKey): string {
  return ROW_LABELS[rowKey];
}

export function isViewerDirectedExecutor(
  state: GameState,
  viewerUserId: string
): boolean {
  const directed = state.directedPlay;
  if (!directed || !state.currentPlayer) return false;
  const myCard = state.scorecards.find((s) => s.userId === viewerUserId);
  if (!myCard) return false;
  return (
    state.currentPlayer.gamePlayerId === myCard.gamePlayerId &&
    directed.executorGamePlayerId === myCard.gamePlayerId
  );
}

export function getDirectorScorecard(state: GameState) {
  const directed = state.directedPlay;
  if (!directed) return null;
  return (
    state.scorecards.find(
      (s) => s.gamePlayerId === directed.directorGamePlayerId
    ) ?? null
  );
}

export function isDirectedTargetCell(
  directedPlay: DirectedPlay | null | undefined,
  scorecardGamePlayerId: string,
  columnType: ColumnType,
  rowKey: FillableRowKey
): boolean {
  if (!directedPlay) return false;
  return (
    scorecardGamePlayerId === directedPlay.directorGamePlayerId &&
    columnType === "DOJAVA" &&
    rowKey === directedPlay.rowKey
  );
}

export function isDirectedPlayPending(state: GameState): boolean {
  return state.directedPlay !== null;
}
