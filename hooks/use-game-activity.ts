"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/lib/api/types";
import type { FillableRowKey } from "@/lib/yamb/types";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";

export interface GameActivityEvent {
  id: string;
  message: string;
  at: number;
}

function entryFingerprint(
  scorecard: GameState["scorecards"][0]
): string {
  return scorecard.columns
    .flatMap((col) =>
      Object.entries(col.entries).map(
        ([row, entry]) =>
          `${col.columnType}:${row}:${entry.score}:${entry.isNajava ? 1 : 0}`
      )
    )
    .join("|");
}

function detectNewScoreEvents(
  prev: GameState | null,
  next: GameState
): GameActivityEvent[] {
  if (!prev || prev.game.stateVersion === next.game.stateVersion) return [];

  const events: GameActivityEvent[] = [];
  const ts = Date.now();

  for (const card of next.scorecards) {
    const prevCard = prev.scorecards.find((s) => s.gamePlayerId === card.gamePlayerId);
    if (!prevCard) continue;

    for (const col of card.columns) {
      const prevCol = prevCard.columns.find((c) => c.columnType === col.columnType);
      if (!prevCol) continue;

      for (const [rowKey, entry] of Object.entries(col.entries) as [
        FillableRowKey,
        (typeof col.entries)[FillableRowKey],
      ][]) {
        if (!entry) continue;
        const prevEntry = prevCol.entries[rowKey];
        if (prevEntry?.score === entry.score) continue;

        events.push({
          id: `${card.gamePlayerId}-${col.columnType}-${rowKey}-${next.game.stateVersion}`,
          message: `${card.displayName} upisao ${entry.score} u ${COLUMN_NAMES[col.columnType]} · ${ROW_LABELS[rowKey]}`,
          at: ts,
        });
      }
    }
  }

  if (
    prev.currentPlayer?.gamePlayerId !== next.currentPlayer?.gamePlayerId &&
    next.currentPlayer
  ) {
    events.push({
      id: `turn-${next.game.stateVersion}`,
      message: `Potez: ${next.currentPlayer.displayName}`,
      at: ts,
    });
  }

  return events;
}

export function useGameActivityFeed(state: GameState | undefined) {
  const prevRef = useRef<GameState | null>(null);
  const [events, setEvents] = useState<GameActivityEvent[]>([]);

  useEffect(() => {
    if (!state) return;

    const prev = prevRef.current;
    if (prev && prev.game.id === state.game.id) {
      const incoming = detectNewScoreEvents(prev, state);
      if (incoming.length > 0) {
        setEvents((current) => [...incoming, ...current].slice(0, 12));
      }
    }

    prevRef.current = state;
  }, [state]);

  return events;
}

/** Detect scorecard changes for cell pop animation */
export function useScorecardFingerprint(scorecard: GameState["scorecards"][0]) {
  const fp = entryFingerprint(scorecard);
  const prevRef = useRef(fp);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (prevRef.current !== fp) {
      prevRef.current = fp;
      setVersion((v) => v + 1);
    }
  }, [fp]);

  return version;
}
