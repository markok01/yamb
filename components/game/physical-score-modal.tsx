"use client";

import { useState } from "react";
import type { FillableRowKey } from "@/lib/yamb/types";
import { MAKSIMALNA_ALLOWED_SCORES } from "@/lib/yamb/constants";
import { ROW_LABELS } from "@/lib/ui/labels";

interface PhysicalScoreModalProps {
  rowKey: FillableRowKey;
  columnType: string;
  onSubmit: (score: number, dice?: number[]) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function PhysicalScoreModal({
  rowKey,
  columnType,
  onSubmit,
  onClose,
  isLoading,
}: PhysicalScoreModalProps) {
  const isMaksimalna = columnType === "MAKSIMALNA";
  const allowed = isMaksimalna ? MAKSIMALNA_ALLOWED_SCORES[rowKey] : null;

  const [score, setScore] = useState(
    allowed?.length === 1 ? String(allowed[0]) : ""
  );
  const [dice, setDice] = useState(["", "", "", "", ""]);
  const [useDice, setUseDice] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const scoreNum = parseInt(score, 10);
    if (Number.isNaN(scoreNum)) return;

    if (useDice) {
      const diceNums = dice.map((d) => parseInt(d, 10));
      if (diceNums.some((d) => Number.isNaN(d) || d < 1 || d > 6)) return;
      onSubmit(scoreNum, diceNums);
    } else {
      onSubmit(scoreNum);
    }
  }

  return (
    <div className="scorecard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="scorecard-modal-panel w-full max-w-md rounded-2xl border p-6 shadow-xl">
        <h3 className="text-lg font-bold" style={{ color: "var(--y-text)" }}>
          Upis — {ROW_LABELS[rowKey]}
        </h3>
        <p className="mt-1 text-sm" style={{ color: "var(--y-text-muted)" }}>
          Unesi rezultat sa stola
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--y-text)" }}
            >
              Rezultat
            </label>
            {isMaksimalna && allowed ? (
              <select
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="y-input mt-1 w-full rounded-lg px-3 py-2"
                required
              >
                {allowed.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={0}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="y-input mt-1 w-full rounded-lg px-3 py-2"
                required
                autoFocus
              />
            )}
          </div>

          <label
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--y-text-muted)" }}
          >
            <input
              type="checkbox"
              checked={useDice}
              onChange={(e) => setUseDice(e.target.checked)}
            />
            Unesi kockice za validaciju (opciono)
          </label>

          {useDice && (
            <div className="flex gap-2">
              {dice.map((d, i) => (
                <input
                  key={i}
                  type="number"
                  min={1}
                  max={6}
                  value={d}
                  onChange={(e) => {
                    const next = [...dice];
                    next[i] = e.target.value;
                    setDice(next);
                  }}
                  className="y-input w-12 rounded-lg px-2 py-2 text-center"
                  placeholder={`${i + 1}`}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border py-2 transition hover:opacity-80"
              style={{
                borderColor: "var(--y-border-strong)",
                color: "var(--y-text)",
              }}
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl py-2 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--y-accent)" }}
            >
              {isLoading ? "..." : "Upiši"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
