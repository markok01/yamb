"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useGameState, useGameStream } from "@/hooks/use-game-queries";
import { useSessionStore } from "@/stores/session-store";
import { AppHeader } from "@/components/layout/app-header";
import { GameStatusBar } from "@/components/game/game-status-panel";
import { getTurnPhaseInfo } from "@/lib/ui/turn-phase";
import { resolveAiDifficulty } from "@/lib/ui/ai-session";
import { GameBoard } from "@/components/game/game-board";
import { LobbyView } from "@/components/game/lobby-view";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSessionStore((s) => s.user);

  const { data, isLoading, isError, error } = useGameState(
    gameId,
    user?.id ?? null
  );

  const streamEnabled =
    !!data &&
    (data.game.status === "IN_PROGRESS" || data.game.status === "LOBBY");

  useGameStream(gameId, user?.id ?? null, streamEnabled);

  useEffect(() => {
    if (!user) router.replace("/lobby");
  }, [user, router]);

  const hasAiPlayer = data?.players.some((p) => p.isAi) ?? false;
  const aiDifficulty = useMemo(
    () =>
      data
        ? resolveAiDifficulty(
            gameId,
            searchParams.get("ai"),
            hasAiPlayer
          )
        : null,
    [data, gameId, searchParams, hasAiPlayer]
  );

  if (!user) return null;

  const modeLabel =
    data?.game.diceMode === "PHYSICAL" ? "Fizičke" : "Virtuelne";

  return (
    <div className="y-app-bg flex min-h-full flex-col">
      <AppHeader title="Partija" />
      <main
        className={
          data?.game.status === "IN_PROGRESS" || data?.game.status === "FINISHED"
            ? "mx-auto w-full max-w-none flex-1 px-2 py-3 sm:px-3 lg:px-4"
            : "mx-auto w-full max-w-[1600px] flex-1 px-4 py-6"
        }
      >
        {data && (
          <GameStatusBar
            roomCode={data.game.roomCode}
            status={data.game.status}
            diceMode={modeLabel}
            currentPlayer={data.currentPlayer?.displayName}
            isMyTurn={data.currentPlayer?.userId === user.id}
            activeColumn={data.activeTurn?.turn.columnType ?? null}
            turnPhaseLabel={
              data.game.status === "IN_PROGRESS" && data.currentPlayer
                ? getTurnPhaseInfo(
                    data,
                    data.currentPlayer.gamePlayerId,
                    data.game.diceMode
                  )?.label ?? null
                : null
            }
          />
        )}

        {isLoading && (
          <p className="text-center text-[var(--y-text-muted)]">Učitavanje partije...</p>
        )}

        {isError && (
          <p className="text-center text-red-400">{(error as Error).message}</p>
        )}

        {data?.game.status === "LOBBY" && (
          <LobbyView gameId={gameId} userId={user.id} state={data} />
        )}

        {(data?.game.status === "IN_PROGRESS" ||
          data?.game.status === "FINISHED") && (
          <GameBoard
            gameId={gameId}
            userId={user.id}
            state={data}
            aiDifficulty={aiDifficulty}
          />
        )}

        <div className="mt-4 text-center">
          <Link
            href="/lobby"
            className="text-sm text-[var(--y-text-muted)] transition hover:text-[var(--y-accent)]"
          >
            ← Nazad u hol
          </Link>
        </div>
      </main>
    </div>
  );
}
