"use client";

import { useState } from "react";
import type { GameState } from "@/lib/api/types";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import { ScorecardTable } from "@/components/scorecard/scorecard-table";
import { OpponentScorecardOverlay } from "@/components/scorecard/opponent-scorecard-overlay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";
import {
  getDirectorScorecard,
  isViewerDirectedExecutor,
} from "@/lib/ui/directed-play";
import { ROW_LABELS } from "@/lib/ui/labels";

interface MultiplayerScorecardsProps {
  state: GameState;
  viewerUserId: string;
  ownScorecardProps: Omit<
    React.ComponentProps<typeof ScorecardTable>,
    "scorecard"
  >;
  onOwnCellClick?: (
    columnType: ColumnType,
    rowKey: FillableRowKey,
    isCorrection?: boolean
  ) => void;
}

export function MultiplayerScorecards({
  state,
  viewerUserId,
  ownScorecardProps,
  onOwnCellClick,
}: MultiplayerScorecardsProps) {
  const myCard = state.scorecards.find((s) => s.userId === viewerUserId);
  const opponents = state.scorecards.filter((s) => s.userId !== viewerUserId);
  const activePlayerId = state.currentPlayer?.gamePlayerId ?? null;
  const [overlayId, setOverlayId] = useState<string | null>(null);

  if (!myCard) return null;

  const isDirectedExecutor = isViewerDirectedExecutor(state, viewerUserId);
  const directorCard = getDirectorScorecard(state);
  const displayCard =
    isDirectedExecutor && directorCard ? directorCard : myCard;
  const viewingDirectorTable = displayCard.gamePlayerId !== myCard.gamePlayerId;

  const overlayCard = overlayId
    ? state.scorecards.find((s) => s.gamePlayerId === overlayId)
    : null;

  const tableProps = {
    ...ownScorecardProps,
    scorecardGamePlayerId: displayCard.gamePlayerId,
    isDirectedExecutor,
    directedPlay: state.directedPlay,
    onCellClick: onOwnCellClick ?? ownScorecardProps.onCellClick,
    turn:
      ownScorecardProps.isMyActiveTurn || isDirectedExecutor
        ? ownScorecardProps.turn ?? null
        : null,
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {viewingDirectorTable && state.directedPlay && (
        <div className="scorecard-banner-directed flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
          <span className="text-lg">🎯</span>
          <span>
            <strong>Dirigovano polje:</strong>{" "}
            {ROW_LABELS[state.directedPlay.rowKey]} — upiši u kolonu D igrača{" "}
            <strong>{state.directedPlay.directorDisplayName}</strong>
          </span>
        </div>
      )}

      {state.scorecards.length > 1 && (
        <div className="player-switcher flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--y-border)] bg-[var(--y-surface)] p-2">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
            Igrači
          </span>
          <button
            type="button"
            onClick={() => setOverlayId(null)}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition",
              !viewingDirectorTable
                ? "player-switcher-active"
                : "border border-transparent text-[var(--y-text-muted)] hover:border-[var(--y-border-strong)] hover:bg-[var(--y-surface-hover)]"
            )}
          >
            Ti
            {myCard.gamePlayerId === activePlayerId && (
              <Badge variant="live" className="ml-2">
                ●
              </Badge>
            )}
          </button>
          {opponents.map((opp) => (
            <button
              key={opp.gamePlayerId}
              type="button"
              onClick={() => setOverlayId(opp.gamePlayerId)}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition",
                viewingDirectorTable &&
                  opp.gamePlayerId === displayCard.gamePlayerId
                  ? "player-switcher-active"
                  : "border border-transparent text-[var(--y-text-muted)] hover:border-[var(--y-border-strong)] hover:bg-[var(--y-surface-hover)] hover:text-[var(--y-text)]"
              )}
            >
              {opp.displayName}
              {opp.gamePlayerId === activePlayerId && (
                <Badge variant="live" className="ml-2">
                  ●
                </Badge>
              )}
              {state.directedPlay?.directorGamePlayerId === opp.gamePlayerId && (
                <Badge variant="warning" className="ml-2">
                  D
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 w-full flex-1">
        <ScorecardTable
          scorecard={displayCard}
          fullBleed
          {...tableProps}
          highlightActive={
            displayCard.gamePlayerId === activePlayerId || viewingDirectorTable
          }
        />
      </div>

      {overlayCard && overlayCard.gamePlayerId !== displayCard.gamePlayerId && (
        <OpponentScorecardOverlay
          state={state}
          scorecard={overlayCard}
          onClose={() => setOverlayId(null)}
        />
      )}
    </div>
  );
}
