"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { useSessionStore } from "@/stores/session-store";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useAuthMe(enabled = true) {
  const setUser = useSessionStore((s) => s.setUser);
  const clearUser = useSessionStore((s) => s.clearUser);

  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        const data = await apiFetch<{ user: User }>("/api/auth/me");
        setUser(data.user);
        return data.user;
      } catch {
        clearUser();
        return null;
      }
    },
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const setUser = useSessionStore((s) => s.setUser);

  return useMutation({
    mutationFn: (body: {
      email: string;
      password: string;
      displayName: string;
    }) =>
      apiFetch<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setUser(data.user);
      qc.setQueryData(authKeys.me, data.user);
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const setUser = useSessionStore((s) => s.setUser);

  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setUser(data.user);
      qc.setQueryData(authKeys.me, data.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const clearUser = useSessionStore((s) => s.clearUser);

  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      clearUser();
      qc.setQueryData(authKeys.me, null);
      qc.clear();
    },
  });
}
