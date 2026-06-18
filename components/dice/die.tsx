"use client";

import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/ui/cn";

export const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 1],
    [0, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

export interface DieProps {
  value: number;
  index: number;
  held?: boolean;
  rolling?: boolean;
  holdPulse?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export const Die = memo(function Die({
  value,
  index,
  held = false,
  rolling = false,
  holdPulse = false,
  onClick,
  disabled = false,
  readOnly = false,
}: DieProps) {
  const isEmpty = value < 1 || value > 6;
  const pips = !isEmpty ? PIP_LAYOUT[value] : [];
  const interactive = !!onClick && !disabled && !readOnly;

  return (
    <div
      className="die-3d-wrap"
      style={{ "--die-index": index } as CSSProperties}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={cn(
          "die-3d group",
          held && "die-3d-held",
          rolling && "die-3d-rolling",
          holdPulse && "die-3d-hold-pulse",
          isEmpty && !rolling && "die-3d-empty",
          interactive && "die-3d-interactive",
          readOnly && "die-3d-readonly"
        )}
        aria-label={
          isEmpty
            ? `Kockica ${index + 1}`
            : `Kockica ${value}${held ? ", držana" : ""}`
        }
        aria-pressed={held}
      >
        <span className="die-3d-face" aria-hidden>
          <span className="die-3d-shine" />
          <span className="die-3d-grid">
            {pips.map(([row, col], i) => (
              <span
                key={i}
                className="die-3d-pip"
                style={{ gridRow: row + 1, gridColumn: col + 1 }}
              />
            ))}
          </span>
          {isEmpty && !rolling && <span className="die-3d-placeholder">?</span>}
        </span>

        {held && (
          <span className="die-3d-hold-badge" aria-hidden>
            DRŽI
          </span>
        )}
      </button>
    </div>
  );
});

Die.displayName = "Die";
