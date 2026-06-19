"use client";

import type { GameState } from "@/lib/api/types";
import { useStartGame } from "@/hooks/use-game-queries";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LobbyViewProps {
  gameId: string;
  userId: string;
  state: GameState;
}

export function LobbyView({ gameId, userId, state }: LobbyViewProps) {
  const startGame = useStartGame(gameId, userId);
  const isHost = state.game.hostUserId === userId;
  const isPhysical = state.game.diceMode === "PHYSICAL";
  const isLeagueGame = !!state.game.leagueId;
  const minPlayers = isPhysical ? 1 : 2;
  const canStart = isHost && state.players.length >= minPlayers;

  return (
    <GlassPanel glow="accent" className="mx-auto max-w-lg text-center">
      {isLeagueGame ? (
        <>
          <Badge variant="success" className="mb-3">
            Liga meč
          </Badge>
          <p className="text-sm text-[var(--y-text-muted)]">
            Partija je rezervisana za izabrane članove lige
          </p>
          <p className="mt-2 font-mono text-2xl font-black tracking-widest text-[var(--y-text)]">
            {state.game.roomCode}
          </p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--y-text-muted)]">
            Kod sobe
          </p>
          <p className="mt-2 font-mono text-5xl font-black tracking-[0.3em] text-[var(--y-text)]">
            {state.game.roomCode}
          </p>
          <p className="mt-2 text-sm text-[var(--y-text-muted)]">
            Podeli kod sa igračima da se pridruže
          </p>
        </>
      )}

      <div className="mt-8 text-left">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
            Igrači
          </h3>
          <Badge variant="default">{state.players.length}/6</Badge>
        </div>
        <ul className="space-y-2">
          {state.players.map((p) => (
            <li
              key={p.gamePlayerId}
              className="flex items-center justify-between rounded-xl bg-[var(--y-surface-hover)] px-4 py-3"
            >
              <span className="font-medium text-[var(--y-text)]">
                {p.displayName}
              </span>
              {p.userId === state.game.hostUserId && (
                <Badge variant="warning">Domaćin</Badge>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-[var(--y-text-muted)]">
        {isPhysical
          ? "Fizičke kockice — solo igra dozvoljena"
          : "Virtuelne kockice — minimum 2 igrača"}
      </p>

      {isHost ? (
        <Button
          fullWidth
          size="lg"
          className="mt-8"
          disabled={!canStart || startGame.isPending}
          onClick={() => startGame.mutate()}
        >
          {startGame.isPending
            ? "Startovanje..."
            : canStart
              ? "Pokreni partiju"
              : "Čekamo igrače..."}
        </Button>
      ) : (
        <p className="mt-8 animate-pulse text-[var(--y-text-muted)]">
          Čekamo domaćina...
        </p>
      )}

      {startGame.isError && (
        <p className="mt-3 text-sm text-red-400">
          {(startGame.error as Error).message}
        </p>
      )}
    </GlassPanel>
  );
}
