"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DiceMode } from "@/lib/yamb/types";
import type { AiDifficulty } from "@/lib/yamb/ai-player";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  useCreateGame,
  useGuestAuth,
  useJoinGame,
} from "@/hooks/use-game-queries";
import { useCreateGameVsAi } from "@/hooks/use-ai-opponent";
import { storeAiDifficulty } from "@/lib/ui/ai-session";
import { useGameHistoryList } from "@/hooks/use-user-queries";
import { useSessionStore } from "@/stores/session-store";
import { ApiClientError } from "@/lib/api/client";

import { MATCH_RESULT_SHORT } from "@/lib/ui/labels";

const RESULT_LABELS = MATCH_RESULT_SHORT;

export default function LobbyPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [diceMode, setDiceMode] = useState<DiceMode>("VIRTUAL");
  const [playMode, setPlayMode] = useState<"multiplayer" | "vs_ai">("multiplayer");
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");
  const [error, setError] = useState<string | null>(null);

  const guestAuth = useGuestAuth();
  const createGame = useCreateGame(user?.id ?? null);
  const createGameVsAi = useCreateGameVsAi(user?.id ?? null);
  const joinGame = useJoinGame(user?.id ?? null);
  const { data: historyData } = useGameHistoryList(user?.id ?? null);

  const recentMatches = useMemo(
    () => historyData?.games.slice(0, 5) ?? [],
    [historyData]
  );

  const wins = useMemo(
    () => recentMatches.filter((g) => g.result === "win").length,
    [recentMatches]
  );

  async function ensureUser(): Promise<string> {
    if (user?.id) return user.id;
    const name = displayName.trim();
    if (!name) throw new Error("Unesite ime ili se prijavite");
    const result = await guestAuth.mutateAsync(name);
    setUser(result.user);
    return result.user.id;
  }

  async function handleCreate() {
    setError(null);
    try {
      await ensureUser();
      if (diceMode === "VIRTUAL" && playMode === "vs_ai") {
        const result = await createGameVsAi.mutateAsync();
        storeAiDifficulty(result.gameId, aiDifficulty);
        router.push(`/game/${result.gameId}?ai=${aiDifficulty}`);
        return;
      }
      const result = await createGame.mutateAsync(diceMode);
      router.push(`/game/${result.gameId}`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : (e as Error).message);
    }
  }

  async function handleJoin() {
    setError(null);
    try {
      await ensureUser();
      const code = roomCode.trim().toUpperCase();
      if (!code) throw new Error("Unesite kod sobe");
      const result = await joinGame.mutateAsync(code);
      router.push(`/game/${result.gameId}`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : (e as Error).message);
    }
  }

  const isLoading =
    guestAuth.isPending ||
    createGame.isPending ||
    createGameVsAi.isPending ||
    joinGame.isPending;

  return (
    <PageShell maxWidth="6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="live" pulse className="mb-3">
            Hol · Spreman za igru
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-[var(--y-text)]">
            Jamb arena
          </h1>
          <p className="mt-2 max-w-lg text-[var(--y-text-muted)]">
            Kreiraj sobu, pozovi prijatelje i igraj premium digitalni Jamb.
          </p>
        </div>
        {user && (
          <div className="flex gap-3">
            <StatCard label="Poslednjih 5" value={recentMatches.length} accent="secondary" />
            <StatCard label="Pobede" value={wins} accent="primary" />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Create game */}
          <GlassPanel glow="accent">
            <h2 className="mb-4 text-lg font-bold text-[var(--y-text)]">
              Kreiraj partiju
            </h2>

            {!user && (
              <div className="mb-4 space-y-3">
                <p className="text-sm text-[var(--y-text-muted)]">
                  <Link href="/login" className="y-link">
                    Prijavi se
                  </Link>{" "}
                  za statistiku, ili igraj kao gost:
                </p>
                <Input
                  label="Ime za prikaz"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Marko"
                  maxLength={50}
                />
              </div>
            )}

            {user && (
              <p className="mb-4 text-sm text-[var(--y-text-muted)]">
                Igraš kao{" "}
                <strong className="text-[var(--y-text)]">{user.displayName}</strong>
                {user.isGuest && (
                  <Badge variant="warning" className="ml-2">
                    Gost
                  </Badge>
                )}
              </p>
            )}

            <p className="mb-2 text-sm font-medium text-[var(--y-text-muted)]">
              Način igre
            </p>
            <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["VIRTUAL", "Virtuelne kockice", "Baci u aplikaciji"],
                  ["PHYSICAL", "Fizičke kockice", "Samo tabela"],
                ] as const
              ).map(([mode, title, desc]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDiceMode(mode)}
                  className={[
                    "rounded-xl border-2 p-4 text-left transition-all duration-200",
                    diceMode === mode
                      ? "y-row-highlight border-2 border-[color-mix(in_srgb,var(--y-accent)_45%,transparent)]"
                      : "border-2 border-[var(--y-border)] hover:border-[var(--y-border-strong)]",
                  ].join(" ")}
                >
                  <span className="block font-semibold text-[var(--y-text)]">
                    {title}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--y-text-muted)]">
                    {desc}
                  </span>
                </button>
              ))}
            </div>

            {diceMode === "VIRTUAL" && (
              <>
                <p className="mb-2 text-sm font-medium text-[var(--y-text-muted)]">
                  Protivnik
                </p>
                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["multiplayer", "Čekaj igrače", "Pozovi prijatelje kodom sobe"],
                      ["vs_ai", "Protiv računara", "Igra bez interneta"],
                    ] as const
                  ).map(([mode, title, desc]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPlayMode(mode)}
                      className={[
                        "rounded-xl border-2 p-4 text-left transition-all duration-200",
                        playMode === mode
                          ? "y-row-highlight border-2 border-[color-mix(in_srgb,var(--y-accent)_45%,transparent)]"
                          : "border-2 border-[var(--y-border)] hover:border-[var(--y-border-strong)]",
                      ].join(" ")}
                    >
                      <span className="block font-semibold text-[var(--y-text)]">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--y-text-muted)]">
                        {desc}
                      </span>
                    </button>
                  ))}
                </div>

                {playMode === "vs_ai" && (
                  <>
                    <p className="mb-2 text-sm font-medium text-[var(--y-text-muted)]">
                      Težina
                    </p>
                    <div className="mb-6 flex flex-wrap gap-2">
                      {(
                        [
                          ["easy", "Lako"],
                          ["medium", "Srednje"],
                          ["hard", "Teško"],
                        ] as const
                      ).map(([level, label]) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setAiDifficulty(level)}
                          className={[
                            "rounded-lg border px-4 py-2 text-sm font-medium transition",
                            aiDifficulty === level
                              ? "border-[var(--y-accent)] bg-[var(--y-accent-soft)] text-[var(--y-text)]"
                              : "border-[var(--y-border)] text-[var(--y-text-muted)] hover:border-[var(--y-border-strong)]",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <Button fullWidth size="lg" disabled={isLoading} onClick={handleCreate}>
              {diceMode === "VIRTUAL" && playMode === "vs_ai"
                ? "Igraj protiv računara"
                : "Kreiraj sobu"}
            </Button>
            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
          </GlassPanel>

          {/* Join */}
          <GlassPanel>
            <h2 className="mb-4 text-lg font-bold text-[var(--y-text)]">
              Pridruži se
            </h2>
            <div className="flex gap-2">
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="KOD SOBE"
                maxLength={8}
                className="font-mono uppercase tracking-widest"
              />
              <Button
                variant="secondary"
                size="lg"
                disabled={isLoading}
                onClick={handleJoin}
                className="shrink-0"
              >
                Pridruži se
              </Button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
          </GlassPanel>
        </div>

        {/* Sidebar: recent matches */}
        <div className="space-y-4">
          <GlassPanel padding="sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
              Poslednje partije
            </h3>
            {!recentMatches.length ? (
              <p className="text-sm text-[var(--y-text-muted)]">
                Još nema završenih mečeva.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentMatches.map((g) => (
                  <li key={g.gameId}>
                    <Link
                      href={`/history/${g.gameId}`}
                      className="flex items-center justify-between rounded-xl bg-[var(--y-surface-hover)] px-3 py-2 transition hover:bg-[var(--y-accent-soft)]"
                    >
                      <div>
                        <span className="font-mono text-sm font-bold text-[var(--y-text)]">
                          {g.roomCode}
                        </span>
                        <p className="text-[10px] text-[var(--y-text-muted)]">
                          {g.opponents.map((o) => o.displayName).join(", ") || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            g.result === "win"
                              ? "success"
                              : g.result === "loss"
                                ? "danger"
                                : "default"
                          }
                        >
                          {RESULT_LABELS[g.result]}
                        </Badge>
                        <p className="mt-1 text-sm font-bold tabular-nums y-accent-text">
                          {g.myScore ?? "—"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/history"
              className="y-link mt-3 block text-center text-xs font-medium"
            >
              Sva istorija →
            </Link>
          </GlassPanel>

          <GlassPanel padding="sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
              Brzi linkovi
            </h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings">
                <Button variant="secondary" size="sm">
                  Profil
                </Button>
              </Link>
              <Link href="/league/create">
                <Button variant="secondary" size="sm">
                  Nova liga
                </Button>
              </Link>
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageShell>
  );
}
