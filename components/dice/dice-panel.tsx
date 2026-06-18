"use client";

import { useEffect, useRef, useState } from "react";
import { Die } from "@/components/dice/die";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

interface DicePanelProps {
  dice: number[];
  heldDice: boolean[];
  rollCount: number;
  canRoll: boolean;
  canHold: boolean;
  isLoading: boolean;
  onRoll: () => void;
  onToggleHold: (index: number) => void;
  /** Posmatrački režim — prikaz kockica aktivnog igrača */
  readOnly?: boolean;
  playerLabel?: string;
  /** AI / protivnik razmišlja */
  thinking?: boolean;
  /** Nema aktivnog bacanja — igrač bira kolonu */
  waitingForTurn?: boolean;
}

function RollProgress({ rollCount }: { rollCount: number }) {
  const current = Math.min(rollCount, 3);
  return (
    <div className="dice-roll-progress">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
        <span>Bacanje</span>
        <span className="tabular-nums text-[var(--y-text)]">
          {current} / 3
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={cn(
              "dice-roll-step h-1.5 flex-1 rounded-full transition-all duration-300",
              step <= current && "dice-roll-step-active"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function statusMessage(
  readOnly: boolean,
  rollCount: number,
  canRoll: boolean,
  thinking: boolean,
  waitingForTurn: boolean,
  heldCount: number
): string {
  if (thinking) return "Računar razmišlja…";
  if (waitingForTurn) {
    return readOnly
      ? "Protivnik bira kolonu…"
      : "Klikni polje u tabeli da započneš potez";
  }
  if (readOnly && rollCount === 0) return "Spreman za prvo bacanje";
  if (readOnly && rollCount >= 3) return "Bira polje za upis";
  if (readOnly && rollCount > 0)
    return heldCount > 0
      ? `Drži ${heldCount} kockic${heldCount === 1 ? "u" : "e"}`
      : "Baca kockice…";
  if (rollCount === 0 && canRoll) return "Spremno — klikni „Baci kockice”";
  if (rollCount >= 3) return "Moraš upisati rezultat u tabelu";
  if (rollCount > 0 && canRoll)
    return heldCount > 0
      ? `${heldCount} kockic${heldCount === 1 ? "a" : "e"} držano — možeš ponovo baciti`
      : "Klikni kockicu da je držiš, pa ponovo baci";
  return "Izaberi polje u tabeli";
}

export function DicePanel({
  dice,
  heldDice,
  rollCount,
  canRoll,
  canHold,
  isLoading,
  onRoll,
  onToggleHold,
  readOnly = false,
  playerLabel,
  thinking = false,
  waitingForTurn = false,
}: DicePanelProps) {
  const [rolling, setRolling] = useState(false);
  const [pendingRoll, setPendingRoll] = useState(false);
  const [holdPulseIndex, setHoldPulseIndex] = useState<number | null>(null);
  const prevRoll = useRef(rollCount);
  const prevHeld = useRef(heldDice);

  useEffect(() => {
    if (rollCount > prevRoll.current) {
      setRolling(true);
      setPendingRoll(false);
      const t = setTimeout(() => setRolling(false), 680);
      prevRoll.current = rollCount;
      return () => clearTimeout(t);
    }
    prevRoll.current = rollCount;
  }, [rollCount]);

  useEffect(() => {
    if (pendingRoll && !isLoading) {
      setPendingRoll(false);
    }
  }, [pendingRoll, isLoading]);

  useEffect(() => {
    let changedIndex: number | null = null;
    for (let i = 0; i < heldDice.length; i++) {
      if (heldDice[i] !== prevHeld.current[i]) {
        changedIndex = i;
        break;
      }
    }
    prevHeld.current = [...heldDice];
    if (changedIndex === null) return;

    setHoldPulseIndex(changedIndex);
    const t = setTimeout(() => setHoldPulseIndex(null), 320);
    return () => clearTimeout(t);
  }, [heldDice]);

  const isAnimating = rolling || pendingRoll || (isLoading && !readOnly);
  const heldCount = heldDice.filter(Boolean).length;
  const status = statusMessage(
    readOnly,
    rollCount,
    canRoll,
    thinking,
    waitingForTurn,
    heldCount
  );

  function handleRoll() {
    setPendingRoll(true);
    onRoll();
  }

  function handleToggleHold(index: number) {
    setHoldPulseIndex(index);
    onToggleHold(index);
  }

  return (
    <GlassPanel
      glow={readOnly ? "warm" : "accent"}
      className={cn(
        "dice-panel transition-transform duration-300",
        isAnimating && "dice-panel-shake"
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--y-text-muted)]">
            Kockice
          </h2>
          {readOnly && playerLabel && (
            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--y-text)]">
              {playerLabel}
            </p>
          )}
        </div>
        {!waitingForTurn && <RollProgress rollCount={rollCount} />}
      </div>

      <p
        className={cn(
          "mb-4 min-h-[2.5rem] text-xs leading-relaxed",
          thinking
            ? "animate-pulse font-medium text-[var(--y-accent-secondary)]"
            : "text-[var(--y-text-muted)]"
        )}
      >
        {status}
      </p>

      <div
        className={cn(
          "dice-tray flex flex-wrap justify-center gap-2.5 py-1 sm:gap-3 sm:py-2",
          waitingForTurn && "opacity-50"
        )}
      >
        {dice.map((value, index) => (
          <Die
            key={index}
            index={index}
            value={value}
            held={heldDice[index]}
            rolling={isAnimating && !heldDice[index]}
            holdPulse={holdPulseIndex === index}
            readOnly={readOnly}
            onClick={
              !readOnly && canHold && !isLoading
                ? () => handleToggleHold(index)
                : undefined
            }
            disabled={readOnly || !canHold || isLoading || waitingForTurn}
          />
        ))}
      </div>

      {!readOnly && !waitingForTurn && (
        <div className="mt-6 space-y-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canRoll || isLoading}
            onClick={handleRoll}
            className={cn(isAnimating && "dice-roll-btn-active")}
          >
            {isLoading || pendingRoll ? (
              <span className="inline-flex items-center gap-2">
                <span className="dice-roll-spinner" aria-hidden />
                Bacanje…
              </span>
            ) : rollCount >= 3 ? (
              "Sva 3 bacanja iskorišćena"
            ) : (
              "Baci kockice"
            )}
          </Button>
          {rollCount >= 3 && (
            <p className="text-center text-[10px] font-medium text-[var(--y-warning)]">
              Klikni dozvoljeno polje u tabeli da završiš potez
            </p>
          )}
        </div>
      )}

      {readOnly && !waitingForTurn && (
        <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-[var(--y-text-muted)]">
          Uživo — vidiš bacanje protivnika
        </p>
      )}

      {!readOnly && canHold && rollCount > 0 && rollCount < 3 && (
        <p className="mt-3 text-center text-[10px] text-[var(--y-text-muted)]">
          Tapni kockicu da je <strong className="text-[var(--y-accent)]">DRŽIŠ</strong>
        </p>
      )}
    </GlassPanel>
  );
}
