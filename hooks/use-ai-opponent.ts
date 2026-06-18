"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AiDifficulty } from "@/lib/yamb/ai-player";
import type { GameState } from "@/lib/api/types";
import { apiFetch } from "@/lib/api/client";
import { gameKeys } from "@/hooks/use-game-queries";

interface AiStepResponse {
  skipped?: boolean;
  action?: string;
  actionLabel?: string;
}

export function useAiOpponent(
  gameId: string,
  userId: string,
  state: GameState | undefined,
  aiDifficulty: AiDifficulty | null
) {
  const qc = useQueryClient();
  const [waiting, setWaiting] = useState(false);
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);

  const aiStep = useMutation({
    mutationFn: () =>
      apiFetch<AiStepResponse>(`/api/games/${gameId}/ai/step`, {
        method: "POST",
        userId,
        body: JSON.stringify({ difficulty: aiDifficulty }),
      }),
    onSuccess: (result) => {
      if (result.actionLabel) setLastActionLabel(result.actionLabel);
      qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
    },
  });

  const isAiTurn =
    !!state &&
    state.game.status === "IN_PROGRESS" &&
    !!state.currentPlayer?.isAi;

  const stateVersion = state?.game.stateVersion;

  useEffect(() => {
    if (!aiDifficulty || !isAiTurn) {
      setWaiting(false);
      return;
    }
    if (aiStep.isPending) return;

    setWaiting(true);
    const thinkMs = 1000 + Math.random() * 1000;
    const timer = setTimeout(() => {
      setWaiting(false);
      aiStep.mutate();
    }, thinkMs);

    return () => {
      clearTimeout(timer);
      setWaiting(false);
    };
  }, [aiDifficulty, isAiTurn, stateVersion, aiStep.isPending]);

  const thinking = isAiTurn && (waiting || aiStep.isPending);

  return { thinking, lastActionLabel };
}

export function useCreateGameVsAi(userId: string | null) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ gameId: string; roomCode: string }>("/api/games/vs-ai", {
        method: "POST",
        userId,
        body: JSON.stringify({}),
      }),
  });
}
