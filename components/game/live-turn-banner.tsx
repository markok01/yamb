"use client";

import type { GameState } from "@/lib/api/types";
import type { DiceMode } from "@/lib/yamb/types";
import { isVirtualRollingPhase } from "@/lib/ui/virtual-roll-first";
import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getLiveTurnMessage, getTurnPhaseInfo } from "@/lib/ui/turn-phase";
import { COLUMN_NAMES, ROW_LABELS } from "@/lib/ui/labels";
import { cn } from "@/lib/ui/cn";

interface LiveTurnBannerProps {
  state: GameState;
  viewerUserId: string;
  diceMode: DiceMode;
  aiThinking?: boolean;
  virtualRollFirst?: boolean;
  className?: string;
}

const phaseBadge: Record<string, string> = {
  PICKING_COLUMN: "default",
  DECLARING: "warning",
  ROLLING: "live",
  SELECTING: "success",
  SUBMITTING: "success",
  DIRECTING: "warning",
  DIRECTED_EXECUTION: "live",
};

export function LiveTurnBanner({
  state,
  viewerUserId,
  diceMode,
  aiThinking,
  virtualRollFirst,
  className,
}: LiveTurnBannerProps) {
  if (state.game.status !== "IN_PROGRESS" || !state.currentPlayer) return null;

  const isMyTurn = state.currentPlayer.userId === viewerUserId;
  const isAiTurn = !!state.currentPlayer.isAi;
  const message = aiThinking
    ? "Računar razmišlja…"
    : getLiveTurnMessage(state, diceMode, viewerUserId, {
        virtualRollFirst,
      });
  const phaseInfo = getTurnPhaseInfo(
    state,
    state.currentPlayer.gamePlayerId,
    diceMode,
    { virtualRollFirst }
  );

  const najavaTarget =
    state.activeTurn?.turn.columnType === "NAJAVA" &&
    state.activeTurn.turn.najavaRowKey;

  const directed = state.directedPlay;

  return (
    <GlassPanel
      padding="sm"
      glow={isMyTurn ? "accent" : "warm"}
      className={cn(
        "mb-4 border-2 transition-all duration-300",
        isMyTurn
          ? "border-[color-mix(in_srgb,var(--y-accent)_35%,transparent)]"
          : "border-[var(--y-border)]",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isMyTurn ? "live" : isAiTurn ? "warning" : "default"} pulse={isMyTurn || aiThinking}>
            {aiThinking
              ? "Potez računara"
              : isMyTurn
                ? "Tvoj potez"
                : "Uživo"}
          </Badge>
          {phaseInfo && (
            <Badge variant={phaseBadge[phaseInfo.phase] as "default"}>
              {phaseInfo.label}
            </Badge>
          )}
          {state.activeTurn && (
            <Badge variant="success">
              {COLUMN_NAMES[state.activeTurn.turn.columnType]}
            </Badge>
          )}
        </div>
        <p
          className={cn(
            "text-sm font-medium",
            aiThinking
              ? "animate-pulse text-[var(--y-accent-secondary)]"
              : isMyTurn
                ? "y-accent-text"
                : "text-[var(--y-text)]"
          )}
        >
          {message}
        </p>
      </div>

      {directed && (
        <div className="scorecard-banner-directed mt-2 rounded-xl border px-3 py-2 text-sm">
          <strong>Dirigovano polje:</strong> {ROW_LABELS[directed.rowKey]}
          {isMyTurn && directed.executorGamePlayerId === state.currentPlayer.gamePlayerId ? (
            <span className="text-[var(--y-text-muted)]">
              {" "}
              — upiši u kolonu D igrača {directed.directorDisplayName}
            </span>
          ) : (
            <span className="text-[var(--y-text-muted)]">
              {" "}
              — kolona D ({directed.directorDisplayName})
            </span>
          )}
        </div>
      )}

      {najavaTarget && (
        <p className="mt-2 text-xs text-[var(--y-text-muted)]">
          🔒 Najavljeno polje zaključano na serveru — samo to polje je validno za
          upis.
        </p>
      )}

      {!isMyTurn && (
        <p className="mt-2 text-[10px] uppercase tracking-widest text-[var(--y-text-muted)]">
          Posmatraš — sve akcije dolaze sa servera u realnom vremenu
        </p>
      )}
    </GlassPanel>
  );
}

interface ActivityFeedProps {
  events: Array<{ id: string; message: string }>;
  className?: string;
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  if (events.length === 0) return null;

  return (
    <GlassPanel padding="sm" className={className}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
        Dnevnik uživo
      </h3>
      <ul className="max-h-40 space-y-1.5 overflow-y-auto">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="rounded-lg bg-[var(--y-surface-hover)] px-3 py-2 text-xs text-[var(--y-text-muted)] y-page-enter"
          >
            {ev.message}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
