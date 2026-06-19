"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import { MAKSIMALNA_ALLOWED_SCORES } from "@/lib/yamb/constants";
import type { GameState } from "@/lib/api/types";
import {
  useDirectPlay,
  useHold,
  useNajava,
  useRoll,
  useStartTurn,
  useSubmitScore,
  useCorrectScore,
  useDeleteScore,
} from "@/hooks/use-game-queries";
import { useAiOpponent } from "@/hooks/use-ai-opponent";
import type { AiDifficulty } from "@/lib/yamb/ai-player";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";
import {
  DIRECTED_ROW_MISMATCH_MESSAGE,
  getNextPlayerColumns,
} from "@/lib/ui/directed-play";
import { isVirtualRollingPhase } from "@/lib/ui/virtual-roll-first";
import { createEmptyDice, createEmptyHeldDice } from "@/lib/yamb/dice";
import { useDiceStore } from "@/stores/dice-store";
import { useGamePreferencesStore } from "@/stores/game-preferences-store";
import { useGameUiStore } from "@/stores/game-ui-store";
import { ApiClientError } from "@/lib/api/client";
import { DicePanel } from "@/components/dice/dice-panel";
import { MultiplayerScorecards } from "@/components/game/multiplayer-scorecards";
import { Leaderboard } from "@/components/game/leaderboard";
import { ScorecardFocusLayout } from "@/components/layout/scorecard-focus-layout";
import { LiveTurnBanner } from "@/components/game/live-turn-banner";
import { GlassPanel } from "@/components/ui/glass-panel";
import { AnimatedScore } from "@/components/ui/animated-score";

interface VirtualGameBoardProps {
  gameId: string;
  userId: string;
  state: GameState;
  aiDifficulty?: AiDifficulty | null;
}

export function VirtualGameBoard({
  gameId,
  userId,
  state,
  aiDifficulty = null,
}: VirtualGameBoardProps) {
  const myScorecard = state.scorecards.find((s) => s.userId === userId);
  const isMyTurn = state.currentPlayer?.userId === userId;
  const activeTurn = state.activeTurn;
  const isMyActiveTurn = activeTurn?.gamePlayerId === myScorecard?.gamePlayerId;
  const turnState = isMyActiveTurn ? activeTurn?.turn ?? null : null;
  const rollingPhase = isMyActiveTurn && isVirtualRollingPhase(turnState);
  const committedColumn =
    turnState && !isVirtualRollingPhase(turnState)
      ? turnState.columnType
      : null;

  const directedPlay = state.directedPlay;
  const isDirectedExecutor =
    !!directedPlay &&
    isMyTurn &&
    myScorecard?.gamePlayerId === directedPlay.executorGamePlayerId;
  const isDirectingMode =
    isMyTurn && !directedPlay && !isDirectedExecutor;

  const { thinking: aiThinking } = useAiOpponent(
    gameId,
    userId,
    state,
    aiDifficulty
  );

  const { dice, heldDice, rollCount, syncFromTurn, reset } = useDiceStore();
  const { errorMessage, setErrorMessage, resetTurnUi } = useGameUiStore();
  const playHints = useGamePreferencesStore((s) => s.virtualPlayHints);

  const [openInlineCell, setOpenInlineCell] = useState<{
    columnType: ColumnType;
    rowKey: FillableRowKey;
  } | null>(null);

  const startTurn = useStartTurn(gameId, userId);
  const najava = useNajava(gameId, userId);
  const roll = useRoll(gameId, userId);
  const hold = useHold(gameId, userId);
  const submit = useSubmitScore(gameId, userId);
  const correctScore = useCorrectScore(gameId, userId);
  const deleteScore = useDeleteScore(gameId, userId);
  const direct = useDirectPlay(gameId, userId);

  const isLoading =
    startTurn.isPending ||
    najava.isPending ||
    roll.isPending ||
    hold.isPending ||
    submit.isPending ||
    correctScore.isPending ||
    deleteScore.isPending ||
    direct.isPending;

  const inlineSubmitting =
    submit.isPending || correctScore.isPending || deleteScore.isPending;

  useEffect(() => {
    if (isMyActiveTurn && activeTurn) {
      syncFromTurn(activeTurn.turn);
      return;
    }
    if (!isMyTurn) {
      reset();
    }
  }, [isMyActiveTurn, activeTurn, isMyTurn, syncFromTurn, reset]);

  useEffect(() => {
    if (!isMyActiveTurn) resetTurnUi();
  }, [isMyActiveTurn, resetTurnUi]);

  const activeColumnType = rollingPhase ? null : committedColumn;
  const needsNajava =
    isMyActiveTurn &&
    committedColumn === "NAJAVA" &&
    !activeTurn?.turn.najavaRowKey &&
    rollCount === 0;

  const canRoll =
    isMyTurn &&
    rollCount < 3 &&
    !needsNajava &&
    (!activeTurn || isMyActiveTurn);
  const canHold = isMyActiveTurn && rollCount > 0 && rollCount < 3;
  const canSubmit =
    (isMyActiveTurn || isDirectedExecutor) && rollCount > 0 && !needsNajava;
  const najavaMode = needsNajava;
  const submitMode = canSubmit && !needsNajava;

  function handleError(err: unknown) {
    if (err instanceof ApiClientError) {
      setErrorMessage(err.message);
      return;
    }
    setErrorMessage("Došlo je do greške");
  }

  function submitCell(col: ColumnType, rowKey: FillableRowKey) {
    if (isDirectedExecutor && directedPlay) {
      if (rowKey !== directedPlay.rowKey) {
        setErrorMessage(DIRECTED_ROW_MISMATCH_MESSAGE);
        return;
      }
      submit.mutate({ rowKey, columnType: "DOJAVA" }, { onError: handleError });
      return;
    }

    const needsColumn = rollingPhase || isVirtualRollingPhase(turnState);

    if (col === "MAKSIMALNA") {
      const allowed = MAKSIMALNA_ALLOWED_SCORES[rowKey];
      if (!allowed?.length) return;
      submit.mutate(
        {
          rowKey,
          columnType: needsColumn ? col : undefined,
          score: allowed[0],
        },
        { onError: handleError }
      );
      return;
    }

    submit.mutate(
      {
        rowKey,
        columnType: needsColumn ? col : undefined,
      },
      { onError: handleError }
    );
  }

  function handleDirectPlay(rowKey: FillableRowKey) {
    direct.mutate(rowKey, { onError: handleError });
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
      handleDirectPlay(rowKey);
      return;
    }

    if (isDirectedExecutor && directedPlay) {
      if (rollCount === 0) {
        setErrorMessage("Prvo baci kockice.");
        return;
      }
      if (col !== "DOJAVA" || rowKey !== directedPlay.rowKey) {
        setErrorMessage(DIRECTED_ROW_MISMATCH_MESSAGE);
        return;
      }
      submitCell(col, rowKey);
      return;
    }

    if (!activeTurn && col === "NAJAVA") {
      startTurn.mutate("NAJAVA", {
        onSuccess: () => najava.mutate(rowKey, { onError: handleError }),
        onError: handleError,
      });
      return;
    }

    if (!activeTurn) {
      setErrorMessage("Prvo baci kockice, pa izaberi polje za upis.");
      return;
    }

    if (rollingPhase) {
      if (rollCount === 0) {
        setErrorMessage("Prvo baci kockice.");
        return;
      }
      if (col === "RUCNA") {
        setOpenInlineCell({ columnType: col, rowKey });
        return;
      }
      submitCell(col, rowKey);
      return;
    }

    if (activeTurn.turn.columnType !== col) {
      setErrorMessage(
        `Završi potez u koloni „${COLUMN_NAMES[activeTurn.turn.columnType]}” pre promene kolone.`
      );
      return;
    }

    if (najavaMode) {
      najava.mutate(rowKey, { onError: handleError });
      return;
    }

    if (!submitMode) return;

    if (col === "RUCNA") {
      setOpenInlineCell({ columnType: col, rowKey });
      return;
    }

    submitCell(col, rowKey);
  }

  function handleInlineScoreSubmit(
    col: ColumnType,
    rowKey: FillableRowKey,
    score: number
  ) {
    flushSync(() => setOpenInlineCell(null));

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

    submit.mutate(
      {
        rowKey,
        columnType: rollingPhase ? col : undefined,
        score,
        isManual: true,
      },
      { onError: handleError }
    );
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
            <h2 className="text-xl font-black text-[var(--y-text)] sm:text-2xl">
              Partija završena!
            </h2>
            <p className="mt-1 text-sm text-[var(--y-text-muted)]">
              Tvoj rezultat:{" "}
              <AnimatedScore
                value={myScorecard.finalScore}
                className="text-2xl font-black text-[var(--y-accent)] sm:text-3xl"
              />
            </p>
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

  const spectatorTurn = !isMyActiveTurn ? activeTurn?.turn : null;
  const currentPlayer = state.currentPlayer;

  const dicePanel =
    currentPlayer &&
    (isMyTurn ? (
      <DicePanel
        dice={isMyActiveTurn ? dice : createEmptyDice()}
        heldDice={
          isMyActiveTurn ? heldDice : createEmptyHeldDice()
        }
        rollCount={isMyActiveTurn ? rollCount : 0}
        canRoll={canRoll && !isLoading}
        canHold={canHold && !isLoading}
        isLoading={isLoading}
        isRolling={roll.isPending}
        waitingForTurn={false}
        onRoll={() => roll.mutate(undefined, { onError: handleError })}
        onToggleHold={(index) =>
          hold.mutate(index, { onError: handleError })
        }
      />
    ) : (
      <DicePanel
        readOnly
        playerLabel={currentPlayer.displayName}
        dice={spectatorTurn?.dice ?? createEmptyDice()}
        heldDice={
          spectatorTurn?.heldDice ?? createEmptyHeldDice()
        }
        rollCount={spectatorTurn?.rollCount ?? 0}
        canRoll={false}
        canHold={false}
        isLoading={false}
        thinking={aiThinking && !!currentPlayer.isAi}
        waitingForTurn={!spectatorTurn}
        onRoll={() => {}}
        onToggleHold={() => {}}
      />
    ));

  const ownScorecardProps = {
    activeColumnType: isDirectedExecutor ? "DOJAVA" : activeColumnType,
    isInteractive: isMyTurn,
    najavaMode,
    submitMode,
    isMyTurn,
    isMyActiveTurn: isMyActiveTurn || !!isDirectedExecutor,
    virtualRollFirst: true,
    showPlayHints: playHints,
    allowCorrection:
      state.game.status === "IN_PROGRESS" && !isDirectedExecutor,
    turn: isMyActiveTurn ? activeTurn?.turn ?? null : null,
    rollCount,
    dice,
    directedPlay,
    isDirectingMode,
    isDirectedExecutor,
    nextPlayerColumns: myScorecard
      ? getNextPlayerColumns(state, myScorecard.gamePlayerId)
      : null,
    directedTargetOnThisCard:
      !!directedPlay &&
      myScorecard?.gamePlayerId === directedPlay.executorGamePlayerId,
    isLoading,
    inlineSubmitting,
    openInlineCell,
    onInlineCancel: () => setOpenInlineCell(null),
    onInlineScoreSubmit: handleInlineScoreSubmit,
    onInlineScoreDelete: handleInlineScoreDelete,
  };

  return (
    <ScorecardFocusLayout
      toolbar={
        <>
          <LiveTurnBanner
            state={state}
            viewerUserId={userId}
            diceMode="VIRTUAL"
            aiThinking={aiThinking}
            virtualRollFirst
          />
          <div className="grid w-full gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            {dicePanel && <div className="w-full">{dicePanel}</div>}
            {errorMessage && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400 xl:col-span-2">
                {errorMessage}
              </p>
            )}
          </div>
        </>
      }
      scorecard={
        <MultiplayerScorecards
          state={state}
          viewerUserId={userId}
          onOwnCellClick={handleCellClick}
          ownScorecardProps={ownScorecardProps}
        />
      }
      footer={
        <Leaderboard entries={state.leaderboard} currentUserId={userId} compact />
      }
    />
  );
}
