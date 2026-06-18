"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import type { ColumnType, DiceMode, FillableRowKey } from "@/lib/yamb/types";
import { apiFetch } from "@/lib/api/client";
import type { GameState, User, UserStatsResponse } from "@/lib/api/types";

export const gameKeys = {
  all: ["games"] as const,
  detail: (id: string) => ["games", id] as const,
};

export const statsKeys = {
  me: (userId: string) => ["stats", userId] as const,
};

export function useGuestAuth() {
  return useMutation({
    mutationFn: (displayName: string) =>
      apiFetch<{ user: User }>("/api/auth/guest", {
        method: "POST",
        body: JSON.stringify({ displayName }),
      }),
  });
}

export function useCreateGame(userId: string | null) {
  return useMutation({
    mutationFn: (diceMode: DiceMode) =>
      apiFetch<{ gameId: string; roomCode: string; diceMode: DiceMode }>(
        "/api/games",
        {
          method: "POST",
          userId,
          body: JSON.stringify({ diceMode }),
        }
      ),
  });
}

export function useJoinGame(userId: string | null) {
  return useMutation({
    mutationFn: (roomCode: string) =>
      apiFetch<{ gameId: string; roomCode: string }>("/api/games/join", {
        method: "POST",
        userId,
        body: JSON.stringify({ roomCode }),
      }),
  });
}

export function useGameState(gameId: string, userId: string | null) {
  return useQuery({
    queryKey: gameKeys.detail(gameId),
    queryFn: () =>
      apiFetch<GameState>(`/api/games/${gameId}/state`, { userId }),
    enabled: !!gameId && !!userId,
    refetchInterval: false,
  });
}

/** SSE — real-time osvežavanje stanja partije (sa reconnect) */
export function useGameStream(
  gameId: string,
  userId: string | null,
  enabled: boolean
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !gameId || !userId) return;

    let es: EventSource | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function connect() {
      if (disposed) return;
      es = new EventSource(`/api/games/${gameId}/stream`);

      es.onmessage = () => {
        retryCount = 0;
        qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (disposed) return;
        const delay = Math.min(1000 * 2 ** retryCount, 30_000);
        retryCount += 1;
        retryTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [gameId, userId, enabled, qc]);
}

export function useStartGame(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/games/${gameId}/start`, { method: "POST", userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
  });
}

export function useStartTurn(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnType: ColumnType) =>
      apiFetch(`/api/games/${gameId}/turns/start`, {
        method: "POST",
        userId,
        body: JSON.stringify({ columnType }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
  });
}

export function useNajava(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rowKey: FillableRowKey) =>
      apiFetch(`/api/games/${gameId}/turns/najava`, {
        method: "POST",
        userId,
        body: JSON.stringify({ rowKey }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
  });
}

export function useRoll(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/games/${gameId}/turns/roll`, {
        method: "POST",
        userId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
  });
}

export function useHold(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (index: number) =>
      apiFetch(`/api/games/${gameId}/turns/hold`, {
        method: "PATCH",
        userId,
        body: JSON.stringify({ index }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
  });
}

export function useDirectPlay(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rowKey: FillableRowKey) =>
      apiFetch(`/api/games/${gameId}/turns/direct`, {
        method: "POST",
        userId,
        body: JSON.stringify({ rowKey }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) }),
  });
}

export function useSubmitScore(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      rowKey: FillableRowKey;
      columnType?: ColumnType;
      score?: number;
      isManual?: boolean;
      dojavaAccepted?: boolean;
      overrideRowKey?: FillableRowKey;
    }) =>
      apiFetch(`/api/games/${gameId}/turns/submit`, {
        method: "POST",
        userId,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      if (userId) qc.invalidateQueries({ queryKey: statsKeys.me(userId) });
    },
  });
}

export function useSubmitPhysical(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      rowKey: FillableRowKey;
      score: number;
      dice?: number[];
    }) =>
      apiFetch(`/api/games/${gameId}/turns/submit-physical`, {
        method: "POST",
        userId,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      if (userId) qc.invalidateQueries({ queryKey: statsKeys.me(userId) });
    },
  });
}

export function useCorrectScore(gameId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      columnType: ColumnType;
      rowKey: FillableRowKey;
      score: number;
    }) =>
      apiFetch(`/api/games/${gameId}/scores`, {
        method: "PATCH",
        userId,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      if (userId) qc.invalidateQueries({ queryKey: statsKeys.me(userId) });
    },
  });
}

export function useUserStats(userId: string | null) {
  return useQuery({
    queryKey: statsKeys.me(userId ?? ""),
    queryFn: () => apiFetch<UserStatsResponse>("/api/stats", { userId }),
    enabled: !!userId,
  });
}
