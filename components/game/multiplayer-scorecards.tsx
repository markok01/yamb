"use client";

import { useState } from "react";
import type { GameState } from "@/lib/api/types";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import { ScorecardTable } from "@/components/scorecard/scorecard-table";
import { OpponentScorecardOverlay } from "@/components/scorecard/opponent-scorecard-overlay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

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

  const overlayCard = overlayId
    ? state.scorecards.find((s) => s.gamePlayerId === overlayId)
    : null;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {state.scorecards.length > 1 && (
        <div className="player-switcher flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--y-border)] bg-[var(--y-surface)] p-2">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
            Igrači
          </span>
          <button
            type="button"
            className="player-switcher-active shrink-0 rounded-xl px-4 py-2 text-sm font-bold"
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
                "border border-transparent text-[var(--y-text-muted)] hover:border-[var(--y-border-strong)] hover:bg-[var(--y-surface-hover)] hover:text-[var(--y-text)]"
              )}
            >
              {opp.displayName}
              {opp.gamePlayerId === activePlayerId && (
                <Badge variant="live" className="ml-2">
                  ●
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 w-full flex-1">
        <ScorecardTable
          scorecard={myCard}
          fullBleed
          {...ownScorecardProps}
          highlightActive={myCard.gamePlayerId === activePlayerId}
          onCellClick={onOwnCellClick ?? ownScorecardProps.onCellClick}
          turn={
            ownScorecardProps.isMyActiveTurn
              ? ownScorecardProps.turn ?? null
              : null
          }
        />
      </div>

      {overlayCard && (
        <OpponentScorecardOverlay
          state={state}
          scorecard={overlayCard}
          onClose={() => setOverlayId(null)}
        />
      )}
    </div>
  );
}
