import { calculateAutoScore } from "@/lib/yamb/combinations";
import {
  canFillCell,
  getAvailableRows,
  isCellEmpty,
  isObaveznaLocked,
} from "@/lib/yamb/columns";
import { MAKSIMALNA_ALLOWED_SCORES } from "@/lib/yamb/constants";
import type { DirectedPlay } from "@/lib/api/types";
import type { ColumnState, ColumnType, Dice, FillableRowKey, TurnState } from "@/lib/yamb/types";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";
import { isVirtualRollingPhase } from "@/lib/ui/virtual-roll-first";

export type CellUiStatus =
  | "filled"
  | "allowed"
  | "blocked"
  | "najava-select"
  | "najava-locked"
  | "inactive"
  | "subtotal";

export interface CellUiState {
  status: CellUiStatus;
  allowed: boolean;
  title: string;
  message: string;
  reason?: string;
  suggestedScore?: number;
  scoreHint?: string;
  isDojavaSuggestion?: boolean;
}

export interface ScorecardInteractionContext {
  isMyTurn: boolean;
  isMyActiveTurn: boolean;
  activeColumnType: ColumnType | null;
  najavaMode: boolean;
  submitMode: boolean;
  turn: TurnState | null;
  rollCount: number;
  dice: Dice;
  dojavaSuggestion: { rowKey: FillableRowKey; score: number } | null;
  showDojava: boolean;
  dojavaRejected: boolean;
  /** Fizičke kockice — nema virtuelnog bacanja */
  isPhysical?: boolean;
  /** Virtuelne kockice — prvo bacanje, pa izbor polja */
  virtualRollFirst?: boolean;
  /** Dozvoljena ispravka postojećih unosa (fizičke kockice) */
  allowCorrection?: boolean;
  /** Prikaži predloge (pulsirajuća polja, sistemski rezultat) */
  showPlayHints?: boolean;
  /** Aktivna diriga — sledeći igrač mora odigrati ovo polje */
  directedPlay?: DirectedPlay | null;
  /** Može najaviti polje u koloni D sledećem igraču */
  isDirectingMode?: boolean;
  /** Izvodi dirigovani potez */
  isDirectedExecutor?: boolean;
}

function rowLabel(row: FillableRowKey): string {
  return ROW_LABELS[row];
}

function columnLabel(col: ColumnType): string {
  return COLUMN_NAMES[col];
}

function scoreRangeHint(
  columnType: ColumnType,
  rowKey: FillableRowKey,
  dice: Dice,
  rollCount: number,
  showHints: boolean
): string | undefined {
  if (!showHints) return undefined;
  if (columnType === "MAKSIMALNA") {
    const allowed = MAKSIMALNA_ALLOWED_SCORES[rowKey];
    return allowed?.length ? `Dozvoljeno: ${allowed.join(", ")}` : undefined;
  }
  if (columnType === "RUCNA") {
    return "Ručni unos — klikni polje i unesi vrednost";
  }
  if (rollCount === 0) {
    return "Prvo baci kockice";
  }
  const auto = calculateAutoScore(rowKey, dice);
  return `Sistemski rezultat: ${auto}`;
}

export function getCellUiState(
  column: ColumnState,
  allColumns: ColumnState[],
  rowKey: FillableRowKey,
  ctx: ScorecardInteractionContext
): CellUiState {
  const hints = ctx.showPlayHints !== false;
  const c = hints
    ? ctx
    : { ...ctx, showDojava: false, dojavaSuggestion: null };
  const col = column.columnType;
  const filled = column.entries[rowKey] !== undefined;
  const cellName = `${rowLabel(rowKey)} · ${columnLabel(col)}`;

  if (filled) {
    const entry = column.entries[rowKey]!;
    const isNajavaLock =
      col === "NAJAVA" && ctx.turn?.najavaRowKey === rowKey;
    if (ctx.allowCorrection) {
      return {
        status: "filled",
        allowed: true,
        title: cellName,
        message: `Klikni da ispraviš ili obrišeš (${entry.score})`,
        suggestedScore: entry.score,
      };
    }
    return {
      status: isNajavaLock ? "najava-locked" : "filled",
      allowed: false,
      title: cellName,
      message: isNajavaLock
        ? `Najavljeno: ${rowLabel(rowKey)}`
        : `Upisano: ${entry.score} poena`,
    };
  }

  if (!c.isMyTurn) {
    return {
      status: "inactive",
      allowed: false,
      title: cellName,
      message: "Nije tvoj potez",
      reason: "Sačekaj da drugi igrač završi potez.",
    };
  }

  if (c.isDirectedExecutor && c.directedPlay) {
    const targetRow = c.directedPlay.rowKey;
    if (c.rollCount === 0) {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Dirigovani potez",
        reason: "Prvo baci kockice.",
      };
    }
    if (col === "DOJAVA" && rowKey === targetRow) {
      const hint =
        hints && c.rollCount > 0
          ? calculateAutoScore(rowKey, c.dice)
          : undefined;
      return {
        status: "allowed",
        allowed: true,
        title: cellName,
        message: `Dirigovano: ${rowLabel(rowKey)}`,
        reason: `Upiši samo u kolonu D — ${rowLabel(rowKey)} (D igrača ${c.directedPlay.directorDisplayName}).`,
        suggestedScore: hint,
        scoreHint:
          hint !== undefined ? `Sistemski rezultat: ${hint}` : undefined,
      };
    }
    if (col !== "DOJAVA") {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Samo kolona Dirigovana",
        reason: `Moraš upisati ${rowLabel(targetRow)} u kolonu D.`,
      };
    }
    return {
      status: "blocked",
      allowed: false,
      title: cellName,
      message: "Dirigovano polje",
      reason: `U koloni D možeš samo ${rowLabel(targetRow)}.`,
    };
  }

  if (col === "DOJAVA" && c.isDirectingMode && canFillCell(column, rowKey)) {
    return {
      status: "allowed",
      allowed: true,
      title: cellName,
      message: "Diriguj sledećeg igrača",
      reason: "Klikni da najaviš ovo polje — sledeći igrač mora da ga odigra.",
    };
  }

  if (col === "DOJAVA" && c.isDirectingMode) {
    return {
      status: "blocked",
      allowed: false,
      title: cellName,
      message: "Polje nije dostupno",
      reason: "Ovo polje u koloni Dirigovana još nije slobodno.",
    };
  }

  if (
    c.virtualRollFirst &&
    c.isMyActiveTurn &&
    c.turn &&
    isVirtualRollingPhase(c.turn)
  ) {
    if (c.rollCount === 0) {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Prvo baci kockice",
        reason: "Zadrži kockice po želji, pa izaberi polje za upis.",
      };
    }

    if (col === "NAJAVA") {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Kolona Najava zahteva najavu pre bacanja",
        reason: "Klikni polje u koloni N pre prvog bacanja.",
      };
    }

    if (col === "OBAVEZNA" && isObaveznaLocked(allColumns)) {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Kolona je zaključana",
        reason: "Obavezna se otvara tek kada je ≥70% ostalih kolona popunjeno.",
      };
    }

    if (!isCellEmpty(column, rowKey)) {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Polje je već popunjeno",
        reason: "Izaberi prazno polje za upis.",
      };
    }

    if (col === "DOJAVA") {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Koristi kolonu Dirigovana preko dirige",
        reason: "Klikni prazno polje u koloni D da najaviš sledećem igraču.",
      };
    }

    const hint = scoreRangeHint(col, rowKey, c.dice, c.rollCount, hints);
    return {
      status: "allowed",
      allowed: true,
      title: cellName,
      message: "Klikni da upišeš rezultat",
      scoreHint: hint,
      suggestedScore: hints ? calculateAutoScore(rowKey, c.dice) : undefined,
    };
  }

  if (!c.isMyActiveTurn) {
    if (
      c.virtualRollFirst &&
      c.isMyTurn &&
      !c.activeColumnType &&
      !c.turn
    ) {
      if (col === "OBAVEZNA" && isObaveznaLocked(allColumns)) {
        return {
          status: "blocked",
          allowed: false,
          title: cellName,
          message: "Kolona je zaključana",
          reason: "Obavezna se otvara tek kada je ≥70% ostalih kolona popunjeno.",
        };
      }

      if (col === "NAJAVA" && canFillCell(column, rowKey)) {
        return {
          status: "najava-select",
          allowed: true,
          title: cellName,
          message: "Klikni da najaviš ovo polje",
          reason: "Najava mora biti izabrana pre prvog bacanja kockica.",
        };
      }

      if (col === "DOJAVA" && c.isDirectingMode && canFillCell(column, rowKey)) {
        return {
          status: "allowed",
          allowed: true,
          title: cellName,
          message: "Diriguj sledećeg igrača",
          reason: "Klikni da najaviš ovo polje — sledeći igrač mora da ga odigra.",
        };
      }

      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Prvo baci kockice",
        reason: "Zatim izaberi polje u tabeli za upis.",
      };
    }

    if (c.isMyTurn && !c.activeColumnType) {
      if (col === "OBAVEZNA" && isObaveznaLocked(allColumns)) {
        return {
          status: "blocked",
          allowed: false,
          title: cellName,
          message: "Kolona je zaključana",
          reason: "Obavezna se otvara tek kada je ≥70% ostalih kolona popunjeno.",
        };
      }

      if (!canFillCell(column, rowKey)) {
        const available = getAvailableRows(column);
        const nextHint =
          available.length > 0
            ? `Sledeće dozvoljeno: ${available.map(rowLabel).join(", ")}`
            : undefined;
        return {
          status: "blocked",
          allowed: false,
          title: cellName,
          message: "Moraš popuniti prethodna polja",
          reason: nextHint ?? "Ova kolona ima strogi redosled popunjavanja.",
        };
      }

      if (col === "NAJAVA") {
        return {
          status: "najava-select",
          allowed: true,
          title: cellName,
          message: "Klikni da najaviš ovo polje",
          reason: "Najava mora biti izabrana pre prvog bacanja kockica.",
        };
      }

      if (c.isPhysical) {
        return {
          status: "allowed",
          allowed: true,
          title: cellName,
          message: "Klikni da uneseš rezultat",
          reason: "Potez u ovoj koloni započinje automatski.",
        };
      }

      if (col === "RUCNA") {
        return {
          status: "allowed",
          allowed: true,
          title: cellName,
          message: "Klikni da uneseš ručni rezultat",
        };
      }

      return {
        status: "allowed",
        allowed: true,
        title: cellName,
        message: "Klikni da započneš potez",
        reason: "Zatim baci kockice pa ponovo klikni ovo polje.",
      };
    }

    return {
      status: "inactive",
      allowed: false,
      title: cellName,
      message: "Nije tvoj potez",
      reason: "Sačekaj da drugi igrač završi potez.",
    };
  }

  if (c.activeColumnType !== col) {
    return {
      status: "blocked",
      allowed: false,
      title: cellName,
      message: "Nije aktivna kolona",
      reason: `Trenutno igraš kolonu „${columnLabel(c.activeColumnType!)}”.`,
    };
  }

  if (col === "OBAVEZNA" && isObaveznaLocked(allColumns)) {
    return {
      status: "blocked",
      allowed: false,
      title: cellName,
      message: "Kolona je zaključana",
      reason: "Obavezna se otvara tek kada je ≥70% ostalih kolona popunjeno.",
    };
  }

  if (!canFillCell(column, rowKey)) {
    const available = getAvailableRows(column);
    const nextHint =
      available.length > 0
        ? `Sledeće dozvoljeno: ${available.map(rowLabel).join(", ")}`
        : undefined;
    return {
      status: "blocked",
      allowed: false,
      title: cellName,
      message: "Moraš popuniti prethodna polja",
      reason: nextHint ?? "Ova kolona ima strogi redosled popunjavanja.",
    };
  }

  if (c.najavaMode && col === "NAJAVA") {
    return {
      status: "najava-select",
      allowed: true,
      title: cellName,
      message: "Izaberi polje za NAJAVU pre bacanja",
      reason: "Najava mora biti izabrana pre prvog bacanja kockica.",
    };
  }

  if (col === "NAJAVA" && c.turn?.najavaRowKey && c.turn.najavaRowKey !== rowKey) {
    return {
      status: "blocked",
      allowed: false,
      title: cellName,
      message: "Najava nije izvršena ovde",
      reason: `Najavljeno polje: ${rowLabel(c.turn.najavaRowKey)}`,
    };
  }

  if (c.submitMode) {
    if (c.rollCount === 0 && col !== "RUCNA" && !c.isPhysical) {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Još nisi bacio kockice",
        reason: "Najpre baci kockice, pa upiši rezultat.",
      };
    }

    if (col === "DOJAVA") {
      return {
        status: "blocked",
        allowed: false,
        title: cellName,
        message: "Koristi kolonu Dirigovana preko dirige",
        reason: "Klikni prazno polje u koloni D da najaviš sledećem igraču.",
      };
    }

    const hint = scoreRangeHint(col, rowKey, c.dice, c.rollCount, hints);
    const suggested =
      hints && c.rollCount > 0 ? calculateAutoScore(rowKey, c.dice) : undefined;

    return {
      status: "allowed",
      allowed: true,
      title: cellName,
      message: "Možeš uneti rezultat",
      scoreHint: hint,
      suggestedScore: suggested,
    };
  }

  return {
    status: "inactive",
    allowed: false,
    title: cellName,
    message: "Polje trenutno nije aktivno",
    reason: "Završi prethodne korake poteza.",
  };
}
