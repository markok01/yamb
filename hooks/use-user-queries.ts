"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type {
  GameHistoryDetailResponse,
  GameHistoryResponse,
  LeagueHeadToHeadResponse,
  LeagueInfo,
  LeagueListItem,
  LeagueMatchHistoryItem,
  LeagueNotification,
  LeagueStandingsResponse,
  LeagueStatsResponse,
  User,
  UserHistoryResponse,
  UserStatsResponse,
} from "@/lib/api/types";
import { statsKeys } from "./use-game-queries";

export const userKeys = {
  stats: (id: string) => ["users", id, "stats"] as const,
  history: (id: string) => ["users", id, "history"] as const,
};

export const historyKeys = {
  list: ["games", "history"] as const,
  detail: (id: string) => ["games", id, "history"] as const,
};

export const leagueKeys = {
  list: ["league", "list"] as const,
  detail: (id: string) => ["league", id] as const,
  standings: (id: string) => ["league", id, "standings"] as const,
  history: (id: string) => ["league", id, "history"] as const,
  stats: (id: string) => ["league", id, "stats"] as const,
  notifications: (id: string) => ["league", id, "notifications"] as const,
  h2h: (id: string, userId: string, opponentId: string) =>
    ["league", id, "h2h", userId, opponentId] as const,
};

function invalidateLeague(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: leagueKeys.detail(id) });
  qc.invalidateQueries({ queryKey: leagueKeys.standings(id) });
  qc.invalidateQueries({ queryKey: leagueKeys.history(id) });
  qc.invalidateQueries({ queryKey: leagueKeys.stats(id) });
  qc.invalidateQueries({ queryKey: leagueKeys.notifications(id) });
  qc.invalidateQueries({ queryKey: leagueKeys.list });
}

export function useUpdateProfile(userId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: { displayName?: string; avatarUrl?: string | null }) =>
      apiFetch<{ user: User }>("/api/users/update", {
        method: "PATCH",
        userId,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: userKeys.stats(userId) });
    },
  });
}

export function useDeleteAccount(userId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (confirmText: string) =>
      apiFetch<{ ok: boolean }>("/api/users/me", {
        method: "DELETE",
        userId,
        body: JSON.stringify({ confirmText }),
      }),
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useUserStatsDetail(userId: string | null) {
  return useQuery({
    queryKey: userKeys.stats(userId ?? ""),
    queryFn: () =>
      apiFetch<UserStatsResponse>(`/api/users/${userId}/stats`, { userId }),
    enabled: !!userId,
  });
}

export function useUserHistory(userId: string | null) {
  return useQuery({
    queryKey: userKeys.history(userId ?? ""),
    queryFn: () =>
      apiFetch<UserHistoryResponse>(`/api/users/${userId}/history`, { userId }),
    enabled: !!userId,
  });
}

export function useGameHistoryList(userId: string | null) {
  return useQuery({
    queryKey: historyKeys.list,
    queryFn: () =>
      apiFetch<GameHistoryResponse>("/api/games/history", { userId }),
    enabled: !!userId,
  });
}

export function useGameHistoryDetail(gameId: string, userId: string | null) {
  return useQuery({
    queryKey: historyKeys.detail(gameId),
    queryFn: () =>
      apiFetch<GameHistoryDetailResponse>(`/api/games/${gameId}/history`, {
        userId,
      }),
    enabled: !!gameId && !!userId,
  });
}

export function useCreateLeague(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; season: string; description?: string }) =>
      apiFetch<{ league: LeagueInfo }>("/api/league/create", {
        method: "POST",
        userId,
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      invalidateLeague(qc, data.league.id);
    },
  });
}

export function useUserLeagues(userId: string | null) {
  return useQuery({
    queryKey: leagueKeys.list,
    queryFn: () =>
      apiFetch<{ leagues: LeagueListItem[] }>("/api/league", { userId }),
    enabled: !!userId,
  });
}

export function useJoinLeague(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { leagueId?: string; inviteCode?: string }) =>
      apiFetch<{ league: LeagueInfo }>("/api/league/join", {
        method: "POST",
        userId,
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      invalidateLeague(qc, data.league.id);
    },
  });
}

export function useLeague(leagueId: string, userId: string | null) {
  return useQuery({
    queryKey: leagueKeys.detail(leagueId),
    queryFn: () =>
      apiFetch<{ league: LeagueInfo }>(`/api/league/${leagueId}`, { userId }),
    enabled: !!leagueId && !!userId,
  });
}

export function useLeagueStandings(leagueId: string) {
  return useQuery({
    queryKey: leagueKeys.standings(leagueId),
    queryFn: () =>
      apiFetch<LeagueStandingsResponse>(`/api/league/${leagueId}/standings`),
    enabled: !!leagueId,
  });
}

export function useLeagueHistory(leagueId: string) {
  return useQuery({
    queryKey: leagueKeys.history(leagueId),
    queryFn: () =>
      apiFetch<{ matches: LeagueMatchHistoryItem[] }>(
        `/api/league/${leagueId}/history`
      ),
    enabled: !!leagueId,
  });
}

export function useLeagueStats(leagueId: string) {
  return useQuery({
    queryKey: leagueKeys.stats(leagueId),
    queryFn: () =>
      apiFetch<LeagueStatsResponse>(`/api/league/${leagueId}/stats`),
    enabled: !!leagueId,
  });
}

export function useLeagueNotifications(leagueId: string) {
  return useQuery({
    queryKey: leagueKeys.notifications(leagueId),
    queryFn: () =>
      apiFetch<{ notifications: LeagueNotification[] }>(
        `/api/league/${leagueId}/notifications`
      ),
    enabled: !!leagueId,
  });
}

export function useLeagueHeadToHead(
  leagueId: string,
  userId: string,
  opponentId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: leagueKeys.h2h(leagueId, userId, opponentId),
    queryFn: () =>
      apiFetch<LeagueHeadToHeadResponse>(
        `/api/league/${leagueId}/head-to-head/${opponentId}?userId=${userId}`
      ),
    enabled: enabled && !!leagueId && !!userId && !!opponentId,
  });
}

export function useUpdateLeague(leagueId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ league: LeagueInfo }>(`/api/league/${leagueId}`, {
        method: "PATCH",
        userId,
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateLeague(qc, leagueId),
  });
}

export function useDeleteLeague(leagueId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (confirmName: string) =>
      apiFetch(`/api/league/${leagueId}`, {
        method: "DELETE",
        userId,
        body: JSON.stringify({ confirmName }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.list }),
  });
}

export function useArchiveLeague(leagueId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/league/${leagueId}/archive`, {
        method: "POST",
        userId,
      }),
    onSuccess: () => invalidateLeague(qc, leagueId),
  });
}

export function useLeaveLeague(leagueId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/league/${leagueId}/leave`, { method: "POST", userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leagueKeys.list });
      qc.invalidateQueries({ queryKey: leagueKeys.detail(leagueId) });
    },
  });
}

export function useRegenerateInviteCode(leagueId: string, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ inviteCode: string }>(`/api/league/${leagueId}/invite-code`, {
        method: "POST",
        userId,
      }),
    onSuccess: () => invalidateLeague(qc, leagueId),
  });
}

export { statsKeys };
