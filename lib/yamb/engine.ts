import { calculateAutoScore } from "./combinations";
import { getDojavaSuggestion } from "./dojava";
import {
  createEmptyDice,
  createEmptyHeldDice,
  rollDice,
  toggleHold,
} from "./dice";
import {
  createScoreEntry,
  validateNajavaBeforeRoll,
  validateNewTurn,
  validatePhysicalSubmit,
  validateRoll,
  validateSubmitScore,
} from "./validation";
import type {
  ColumnState,
  ColumnType,
  Dice,
  FillableRowKey,
  ScoreEntry,
  TurnState,
  ValidationResult,
} from "./types";

export interface YambEngineState {
  columns: ColumnState[];
  activeTurn: TurnState | null;
}

export function createEngineState(columns?: ColumnState[]): YambEngineState {
  return {
    columns: columns ?? [],
    activeTurn: null,
  };
}

export function createTurn(columnType: ColumnType): TurnState {
  return {
    columnType,
    rollCount: 0,
    dice: createEmptyDice(),
    heldDice: createEmptyHeldDice(),
    rollHistory: [],
    najavaRowKey: null,
    status: "ACTIVE",
  };
}

function getColumn(
  state: YambEngineState,
  columnType: ColumnType
): ColumnState | undefined {
  return state.columns.find((c) => c.columnType === columnType);
}

export function startTurn(
  state: YambEngineState,
  columnType: ColumnType
): { state: YambEngineState; result: ValidationResult } {
  const turnCheck = validateNewTurn(state.activeTurn);
  if (!turnCheck.valid) {
    return { state, result: turnCheck };
  }

  const column = getColumn(state, columnType);
  if (!column) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "COLUMN_NOT_FOUND",
        message: "Kolona nije pronađena",
      },
    };
  }

  return {
    state: { ...state, activeTurn: createTurn(columnType) },
    result: { valid: true },
  };
}

export function setNajava(
  state: YambEngineState,
  rowKey: FillableRowKey
): { state: YambEngineState; result: ValidationResult } {
  const turn = state.activeTurn;
  if (!turn) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "NO_ACTIVE_TURN",
        message: "Nema aktivnog poteza",
      },
    };
  }

  const column = getColumn(state, turn.columnType);
  if (!column) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "COLUMN_NOT_FOUND",
        message: "Kolona nije pronađena",
      },
    };
  }

  const check = validateNajavaBeforeRoll(column, rowKey, turn.rollCount);
  if (!check.valid) return { state, result: check };

  return {
    state: {
      ...state,
      activeTurn: { ...turn, najavaRowKey: rowKey },
    },
    result: { valid: true },
  };
}

export function roll(
  state: YambEngineState,
  rng?: () => number
): { state: YambEngineState; result: ValidationResult; dice?: Dice } {
  const turn = state.activeTurn;
  if (!turn) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "NO_ACTIVE_TURN",
        message: "Nema aktivnog poteza",
      },
    };
  }

  const check = validateRoll(turn);
  if (!check.valid) return { state, result: check };

  const newDice = rollDice(turn.dice, turn.heldDice, rng);
  const newRollCount = turn.rollCount + 1;
  const newHistory = [...turn.rollHistory, newDice];

  return {
    state: {
      ...state,
      activeTurn: {
        ...turn,
        dice: newDice,
        rollCount: newRollCount,
        rollHistory: newHistory,
      },
    },
    result: { valid: true },
    dice: newDice,
  };
}

export function setHold(
  state: YambEngineState,
  index: number
): { state: YambEngineState; result: ValidationResult } {
  const turn = state.activeTurn;
  if (!turn) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "NO_ACTIVE_TURN",
        message: "Nema aktivnog poteza",
      },
    };
  }

  if (turn.rollCount === 0) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "NO_ROLL_BEFORE_HOLD",
        message: "Ne može držanje pre prvog bacanja",
      },
    };
  }

  if (turn.rollCount >= 3) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "MAX_ROLLS_EXCEEDED",
        message: "Ne može držanje nakon poslednjeg bacanja",
      },
    };
  }

  return {
    state: {
      ...state,
      activeTurn: {
        ...turn,
        heldDice: toggleHold(turn.heldDice, index),
      },
    },
    result: { valid: true },
  };
}

export interface SubmitScoreOptions {
  score?: number;
  isManual?: boolean;
  dojavaAccepted?: boolean;
  /** Ako dojavaAccepted=false, igrač sam bira polje */
  overrideRowKey?: FillableRowKey;
  /** Fizičke kockice — opciono, za validaciju */
  physicalDice?: Dice;
}

export function submitPhysicalScore(
  state: YambEngineState,
  rowKey: FillableRowKey,
  score: number,
  physicalDice?: Dice
): {
  state: YambEngineState;
  result: ValidationResult;
  entry?: ScoreEntry;
} {
  const turn = state.activeTurn;
  if (!turn) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "NO_ACTIVE_TURN",
        message: "Nema aktivnog poteza",
      },
    };
  }

  const column = getColumn(state, turn.columnType);
  if (!column) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "COLUMN_NOT_FOUND",
        message: "Kolona nije pronađena",
      },
    };
  }

  const dice: Dice = physicalDice ?? ([0, 0, 0, 0, 0] as Dice);
  const check = validatePhysicalSubmit(
    turn,
    column,
    state.columns,
    rowKey,
    score,
    dice
  );

  if (!check.valid) return { state, result: check };

  const entry = createScoreEntry(rowKey, score, dice, {
    isManual: true,
    isNajava: turn.columnType === "NAJAVA",
  });

  const updatedColumns = state.columns.map((c) =>
    c.columnType === turn.columnType
      ? { ...c, entries: { ...c.entries, [rowKey]: entry } }
      : c
  );

  return {
    state: { columns: updatedColumns, activeTurn: null },
    result: { valid: true },
    entry,
  };
}

export function submitScore(
  state: YambEngineState,
  rowKey: FillableRowKey,
  options?: SubmitScoreOptions
): {
  state: YambEngineState;
  result: ValidationResult;
  entry?: ScoreEntry;
} {
  const turn = state.activeTurn;
  if (!turn) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "NO_ACTIVE_TURN",
        message: "Nema aktivnog poteza",
      },
    };
  }

  const column = getColumn(state, turn.columnType);
  if (!column) {
    return {
      state,
      result: {
        valid: false,
        errorCode: "COLUMN_NOT_FOUND",
        message: "Kolona nije pronađena",
      },
    };
  }

  let targetRow = rowKey;
  let score = options?.score;
  const dojavaAccepted = options?.dojavaAccepted;

  if (column.columnType === "DOJAVA") {
    const suggestion = getDojavaSuggestion(column, turn.dice);
    if (dojavaAccepted === true && suggestion) {
      targetRow = suggestion.rowKey;
      score = suggestion.score;
    } else if (dojavaAccepted === false) {
      targetRow = options?.overrideRowKey ?? rowKey;
      if (score === undefined) {
        score = calculateAutoScore(targetRow, turn.dice);
      }
    }
  }

  if (score === undefined) {
    score = calculateAutoScore(targetRow, turn.dice);
  }

  const check = validateSubmitScore(
    turn,
    column,
    state.columns,
    targetRow,
    score,
    {
      isManual: options?.isManual,
      dojavaAccepted,
    }
  );

  if (!check.valid) return { state, result: check };

  const entry = createScoreEntry(targetRow, score, turn.dice, {
    isManual: options?.isManual ?? column.columnType === "RUCNA",
    isNajava: turn.columnType === "NAJAVA",
    dojavaAccepted,
  });

  const updatedColumns = state.columns.map((c) =>
    c.columnType === turn.columnType
      ? {
          ...c,
          entries: { ...c.entries, [targetRow]: entry },
        }
      : c
  );

  return {
    state: {
      columns: updatedColumns,
      activeTurn: null,
    },
    result: { valid: true },
    entry,
  };
}

export function getActiveTurn(state: YambEngineState): TurnState | null {
  return state.activeTurn;
}

export function getDojavaForActiveTurn(
  state: YambEngineState
): ReturnType<typeof getDojavaSuggestion> {
  const turn = state.activeTurn;
  if (!turn) return null;
  const column = getColumn(state, turn.columnType);
  if (!column) return null;
  return getDojavaSuggestion(column, turn.dice);
}

/** Reset poteza nakon upisa — već urađen u submitScore (activeTurn = null). */
export function resetTurn(state: YambEngineState): YambEngineState {
  return { ...state, activeTurn: null };
}
