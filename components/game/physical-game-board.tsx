"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import type { GameState } from "@/lib/api/types";
import {
  useDirectPlay,
  useNajava,
  useStartTurn,
  useSubmitPhysical,
  useCorrectScore,
  useDeleteScore,
} from "@/hooks/use-game-queries";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";
import { useGameUiStore } from "@/stores/game-ui-store";
import { ApiClientError } from "@/lib/api/client";
import { MultiplayerScorecards } from "@/components/game/multiplayer-scorecards";
import { Leaderboard } from "@/components/game/leaderboard";
import { ScorecardFocusLayout } from "@/components/layout/scorecard-focus-layout";
import { LiveTurnBanner } from "@/components/game/live-turn-banner";
import { GlassPanel } from "@/components/ui/glass-panel";
import { AnimatedScore } from "@/components/ui/animated-score";

interface PhysicalGameBoardProps {
  gameId: string;
  userId: string;
  state: GameState;
}

export function PhysicalGameBoard({
  gameId,
  userId,
  state,
}: PhysicalGameBoardProps) {
  const myScorecard = state.scorecards.find((s) => s.userId === userId);
  const isMyTurn = state.currentPlayer?.userId === userId;
  const activeTurn = state.activeTurn;
  const isMyActiveTurn = activeTurn?.gamePlayerId === myScorecard?.gamePlayerId;

  const directedPlay = state.directedPlay;
  const isDirectedExecutor =
    !!directedPlay &&
    isMyTurn &&
    myScorecard?.gamePlayerId !== directedPlay.directorGamePlayerId;
  const isDirectingMode =
    isMyTurn && !directedPlay && !isDirectedExecutor;

  const { errorMessage, setErrorMessage, resetTurnUi } = useGameUiStore();
  const [openInlineCell, setOpenInlineCell] = useState<{
    columnType: ColumnType;
    rowKey: FillableRowKey;
  } | null>(null);

  const startTurn = useStartTurn(gameId, userId);
  const najava = useNajava(gameId, userId);
  const submitPhysical = useSubmitPhysical(gameId, userId);
  const correctScore = useCorrectScore(gameId, userId);
  const deleteScore = useDeleteScore(gameId, userId);
  const direct = useDirectPlay(gameId, userId);

  const isLoading =
    startTurn.isPending ||
    najava.isPending ||
    submitPhysical.isPending ||
    correctScore.isPending ||
    deleteScore.isPending ||
    direct.isPending;

  const inlineSubmitting =
    submitPhysical.isPending ||
    correctScore.isPending ||
    deleteScore.isPending;

  const activeColumnType = activeTurn?.turn.columnType ?? null;
  const needsNajava =
    isMyActiveTurn &&
    activeColumnType === "NAJAVA" &&
    !activeTurn?.turn.najavaRowKey;

  useEffect(() => {
    if (!isMyActiveTurn && !isDirectedExecutor) {
      resetTurnUi();
      setOpenInlineCell(null);
    }
  }, [isMyActiveTurn, isDirectedExecutor, resetTurnUi]);

  function handleError(err: unknown) {
    if (err instanceof ApiClientError) {
      setErrorMessage(err.message);
      return;
    }
    setErrorMessage("Došlo je do greške");
  }

  function handleCellClick(
    col: ColumnType,
    rowKey: FillableRowKey,
    isCorrection = false
  ) {
    if (!isMyTurn && !isCorrection) return;
    setErrorMessage(null);

    if (isCorrection) {
      if (isDirectedExecutor) {
        setErrorMessage("Tokom dirigovanog poteza nije moguća ispravka.");
        return;
      }
      setOpenInlineCell({ columnType: col, rowKey });
      return;
    }

    if (col === "DOJAVA" && isDirectingMode) {
      direct.mutate(rowKey, { onError: handleError });
      return;
    }

    if (isDirectedExecutor && directedPlay) {
      if (col !== "DOJAVA" || rowKey !== directedPlay.rowKey) {
        setErrorMessage(
          `Moraš upisati ${ROW_LABELS[directedPlay.rowKey]} samo u kolonu Dirigovana (D).`
        );
        return;
      }
      setOpenInlineCell({ columnType: col, rowKey });
      return;
    }

    if (col === "DOJAVA") {
      setErrorMessage(
        "Kolona Dirigovana: klikni prazno polje u D da najaviš sledećem igraču."
      );
      return;
    }

    if (activeTurn && activeTurn.turn.columnType !== col) {
      setErrorMessage(
        `Završi potez u koloni „${COLUMN_NAMES[activeTurn.turn.columnType]}” pre promene kolone.`
      );
      return;
    }

    if (!activeTurn) {
      if (col === "NAJAVA") {
        startTurn.mutate(col, {
          onSuccess: () => najava.mutate(rowKey, { onError: handleError }),
          onError: handleError,
        });
      } else {
        setOpenInlineCell({ columnType: col, rowKey });
        startTurn.mutate(col, { onError: handleError });
      }
      return;
    }

    if (needsNajava) {
      najava.mutate(rowKey, { onError: handleError });
      return;
    }

    setOpenInlineCell({ columnType: col, rowKey });
  }

  function handleInlineScoreSubmit(
    col: ColumnType,
    rowKey: FillableRowKey,
    score: number
  ) {
    flushSync(() => setOpenInlineCell(null));

    if (isDirectedExecutor && directedPlay) {
      submitPhysical.mutate({ rowKey, score }, { onError: handleError });
      return;
    }

    const existing = myScorecard?.columns
      .find((c) => c.columnType === col)
      ?.entries[rowKey];

    if (existing !== undefined) {
      correctScore.mutate(
        { columnType: col, rowKey, score },
        { onError: handleError }
      );
      return;
    }

    submitPhysical.mutate({ rowKey, score }, { onError: handleError });
  }

  function handleInlineScoreDelete(col: ColumnType, rowKey: FillableRowKey) {
    flushSync(() => setOpenInlineCell(null));
    deleteScore.mutate({ columnType: col, rowKey }, { onError: handleError });
  }

  if (!myScorecard) {
    return (
      <p className="text-center text-[var(--y-text-muted)]">Tabela nije pronađena.</p>
    );
  }

  if (state.game.status === "FINISHED") {
    return (
      <ScorecardFocusLayout
        toolbar={
          <GlassPanel glow="warm" className="text-center" padding="sm">
            <h2 className="text-xl font-black sm:text-2xl">Partija završena!</h2>
            <AnimatedScore
              value={myScorecard.finalScore}
              className="mt-1 text-2xl font-black text-[var(--y-accent)] sm:text-3xl"
            />
          </GlassPanel>
        }
        scorecard={
          <MultiplayerScorecards
            state={state}
            viewerUserId={userId}
            ownScorecardProps={{
              activeColumnType: null,
              isInteractive: false,
              najavaMode: false,
              submitMode: false,
              readOnly: true,
            }}
          />
        }
        footer={
          <Leaderboard entries={state.leaderboard} currentUserId={userId} compact />
        }
      />
    );
  }

  return (
    <ScorecardFocusLayout
      toolbar={
        <>
          <LiveTurnBanner
            state={state}
            viewerUserId={userId}
            diceMode="PHYSICAL"
          />
          {errorMessage && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </p>
          )}
        </>
      }
      scorecard={
        <MultiplayerScorecards
          state={state}
          viewerUserId={userId}
          onOwnCellClick={handleCellClick}
          ownScorecardProps={{
            activeColumnType: isDirectedExecutor ? "DOJAVA" : activeColumnType,
            isInteractive: state.game.status === "IN_PROGRESS",
            najavaMode: needsNajava,
            submitMode:
              (isMyActiveTurn && !needsNajava) || !!isDirectedExecutor,
            isMyTurn,
            isMyActiveTurn: isMyActiveTurn || !!isDirectedExecutor,
            turn: isMyActiveTurn ? activeTurn?.turn ?? null : null,
            isPhysical: true,
            allowCorrection:
              state.game.status === "IN_PROGRESS" && !isDirectedExecutor,
            directedPlay,
            isDirectingMode,
            isDirectedExecutor,
            isLoading,
            inlineSubmitting,
            openInlineCell,
            onInlineCancel: () => setOpenInlineCell(null),
            onInlineScoreSubmit: handleInlineScoreSubmit,
            onInlineScoreDelete: handleInlineScoreDelete,
          }}
        />
      }
      footer={
        <Leaderboard entries={state.leaderboard} currentUserId={userId} compact />
      }
    />
  );
}
