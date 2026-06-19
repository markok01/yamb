import type { ActiveTurn, GameState } from "@/lib/api/types";
import type { DiceMode } from "@/lib/yamb/types";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";
import { isVirtualRollingPhase } from "@/lib/ui/virtual-roll-first";

export type TurnPhase =
  | "PICKING_COLUMN"
  | "DECLARING"
  | "ROLLING"
  | "SELECTING"
  | "SUBMITTING"
  | "DIRECTING"
  | "DIRECTED_EXECUTION";

export interface TurnPhaseInfo {
  phase: TurnPhase;
  label: string;
  detail?: string;
}

function activeTurnForPlayer(
  state: GameState,
  gamePlayerId: string
): ActiveTurn | null {
  if (state.activeTurn?.gamePlayerId !== gamePlayerId) return null;
  return state.activeTurn;
}

function isDirectedExecutor(state: GameState, gamePlayerId: string): boolean {
  const directed = state.directedPlay;
  if (!directed) return false;
  return (
    state.currentPlayer?.gamePlayerId === gamePlayerId &&
    directed.executorGamePlayerId === gamePlayerId
  );
}

export function getTurnPhaseInfo(
  state: GameState,
  gamePlayerId: string,
  diceMode: DiceMode,
  options?: { virtualRollFirst?: boolean }
): TurnPhaseInfo | null {
  const player = state.players.find((p) => p.gamePlayerId === gamePlayerId);
  if (!player) return null;

  const isCurrent = state.currentPlayer?.gamePlayerId === gamePlayerId;
  if (!isCurrent) return null;

  if (isDirectedExecutor(state, gamePlayerId)) {
    const directed = state.directedPlay!;
    const activeTurn = activeTurnForPlayer(state, gamePlayerId);
    if (!activeTurn || activeTurn.turn.rollCount === 0) {
      return {
        phase: "DIRECTED_EXECUTION",
        label: "Dirigovani potez",
        detail: `${player.displayName} mora odigrati ${ROW_LABELS[directed.rowKey]} (D kolona: ${directed.directorDisplayName}).`,
      };
    }
    return {
      phase: "DIRECTED_EXECUTION",
      label: "Dirigovani upis",
      detail: `${player.displayName} upisuje ${ROW_LABELS[directed.rowKey]} u D kolonu igrača ${directed.directorDisplayName}.`,
    };
  }

  if (!state.directedPlay && !state.activeTurn) {
    if (diceMode === "VIRTUAL" && options?.virtualRollFirst) {
      return {
        phase: "DIRECTING",
        label: "Dirigovana / bacanje",
        detail: `${player.displayName} može dirigovati (kolona D) ili baciti kockice.`,
      };
    }
    return {
      phase: "PICKING_COLUMN",
      label: "Bira kolonu",
      detail: "Igrač bira polje u tabeli da započne potez.",
    };
  }

  const activeTurn = activeTurnForPlayer(state, gamePlayerId);
  if (!activeTurn) {
    if (diceMode === "VIRTUAL" && options?.virtualRollFirst) {
      return {
        phase: "ROLLING",
        label: "Baca kockice",
        detail: `${player.displayName} baca kockice pre izbora polja.`,
      };
    }
    return {
      phase: "PICKING_COLUMN",
      label: "Bira kolonu",
      detail: "Igrač bira polje u tabeli da započne potez.",
    };
  }

  const turn = activeTurn.turn;
  const columnLabel = COLUMN_NAMES[turn.columnType];
  const rollingPhase =
    diceMode === "VIRTUAL" &&
    options?.virtualRollFirst &&
    isVirtualRollingPhase(turn);

  if (
    turn.columnType === "NAJAVA" &&
    !turn.najavaRowKey &&
    turn.rollCount === 0
  ) {
    return {
      phase: "DECLARING",
      label: "Najava",
      detail: `${player.displayName} najavljuje polje — sledeći igrač mora odigrati isto u koloni D.`,
    };
  }

  if (diceMode === "PHYSICAL") {
    return {
      phase: "SUBMITTING",
      label: "Upis rezultata",
      detail: `${player.displayName} unosi rezultat — kolona ${columnLabel}.`,
    };
  }

  if (turn.rollCount === 0) {
    return {
      phase: "ROLLING",
      label: "Spreman za bacanje",
      detail: rollingPhase
        ? `${player.displayName} baca kockice pre izbora polja.`
        : `${player.displayName} može baciti kockice (kolona ${columnLabel}).`,
    };
  }

  if (turn.rollCount < 3) {
    return {
      phase: "ROLLING",
      label: "Baca kockice",
      detail: rollingPhase
        ? `${player.displayName} baca kockice (${turn.rollCount}/3)…`
        : `${player.displayName} baca kockice (${turn.rollCount}/3) — kolona ${columnLabel}.`,
    };
  }

  return {
    phase: "SELECTING",
    label: "Bira polje",
    detail: rollingPhase
      ? `${player.displayName} bira polje za upis.`
      : `${player.displayName} bira polje za upis (kolona ${columnLabel}).`,
  };
}

export function getLiveTurnMessage(
  state: GameState,
  diceMode: DiceMode,
  viewerUserId: string,
  options?: { virtualRollFirst?: boolean }
): string | null {
  if (state.game.status !== "IN_PROGRESS" || !state.currentPlayer) return null;

  const activePlayer = state.currentPlayer;
  const isMe = activePlayer.userId === viewerUserId;
  const info = getTurnPhaseInfo(
    state,
    activePlayer.gamePlayerId,
    diceMode,
    options
  );
  if (!info) return null;

  const name = isMe ? "Ti" : activePlayer.displayName;
  const directed = state.directedPlay;

  switch (info.phase) {
    case "DIRECTING":
      return isMe
        ? "Tvoj potez — klikni prazno polje u koloni D da diriguješ, ili baci kockice."
        : `${name} bira dirigu ili baca kockice…`;
    case "DIRECTED_EXECUTION":
      if (!directed) return info.detail ?? null;
      return isMe
        ? `Dirigovano: upiši ${ROW_LABELS[directed.rowKey]} u kolonu D igrača ${directed.directorDisplayName}.`
        : `${name} izvršava dirigu — ${ROW_LABELS[directed.rowKey]} u kolonu D…`;
    case "PICKING_COLUMN":
      return isMe
        ? "Tvoj potez — klikni polje da započneš."
        : `${name} bira kolonu…`;
    case "DECLARING":
      return isMe
        ? `Najavi polje pre bacanja — sledeći igrač mora odigrati isto u koloni D.`
        : `${name} najavljuje polje…`;
    case "ROLLING":
      if (state.activeTurn && state.activeTurn.turn.rollCount > 0) {
        return isMe
          ? `Bacaš kockice (${state.activeTurn.turn.rollCount}/3)…`
          : `${name} baca kockice…`;
      }
      return isMe
        ? options?.virtualRollFirst && diceMode === "VIRTUAL"
          ? "Tvoj potez — prvo baci kockice."
          : "Spreman si za bacanje."
        : `${name} sprema bacanje…`;
    case "SELECTING":
      return isMe ? "Izaberi polje za upis." : `${name} bira polje…`;
    case "SUBMITTING":
      return isMe ? "Unesi rezultat sa stola." : `${name} upisuje rezultat…`;
    default:
      return info.detail ?? null;
  }
}
