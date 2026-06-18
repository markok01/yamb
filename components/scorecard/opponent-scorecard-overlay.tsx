"use client";

import { useEffect } from "react";
import type { GameState } from "@/lib/api/types";
import { ScorecardTable } from "@/components/scorecard/scorecard-table";
import { Button } from "@/components/ui/button";
import { isVirtualRollingPhase } from "@/lib/ui/virtual-roll-first";

interface OpponentScorecardOverlayProps {
  state: GameState;
  scorecard: GameState["scorecards"][0];
  onClose: () => void;
}

export function OpponentScorecardOverlay({
  state,
  scorecard,
  onClose,
}: OpponentScorecardOverlayProps) {
  const activePlayerId = state.currentPlayer?.gamePlayerId ?? null;
  const isActivePlayer = scorecard.gamePlayerId === activePlayerId;
  const activeTurn =
    isActivePlayer && state.activeTurn ? state.activeTurn : null;
  const activeColumnType =
    activeTurn && isVirtualRollingPhase(activeTurn.turn)
      ? null
      : activeTurn?.turn.columnType ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="scorecard-modal-backdrop fixed inset-0 z-50 flex flex-col bg-[color-mix(in_srgb,var(--y-bg)_92%,transparent)] backdrop-blur-md"
      role="dialog"
      aria-modal
      aria-label={`Tabela — ${scorecard.displayName}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--y-border)] bg-[var(--y-surface)] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
            Pregled igrača
          </p>
          <h2 className="text-lg font-bold text-[var(--y-text)]">
            {scorecard.displayName}
            {isActivePlayer && (
              <span className="ml-2 text-sm font-semibold y-accent-text">
                ● na potezu
              </span>
            )}
          </h2>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Zatvori
        </Button>
      </div>

      <div className="scorecard-modal-panel flex flex-1 flex-col overflow-auto p-3 sm:p-4">
        <ScorecardTable
          scorecard={scorecard}
          readOnly
          fullBleed
          highlightActive={isActivePlayer}
          activeColumnType={activeColumnType}
          isInteractive={false}
          najavaMode={
            isActivePlayer &&
            activeTurn?.turn.columnType === "NAJAVA" &&
            !activeTurn.turn.najavaRowKey
          }
          submitMode={false}
          isMyTurn={false}
          isMyActiveTurn={false}
          turn={activeTurn?.turn ?? null}
          rollCount={activeTurn?.turn.rollCount ?? 0}
          dice={activeTurn?.turn.dice ?? [0, 0, 0, 0, 0]}
          dojavaSuggestion={activeTurn?.dojavaSuggestion ?? null}
          showDojava={false}
        />
      </div>
    </div>
  );
}
