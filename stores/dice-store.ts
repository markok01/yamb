import { create } from "zustand";
import type { Dice, HeldDice } from "@/lib/yamb/types";
import type { ActiveTurn } from "@/lib/api/types";
import { createEmptyDice, createEmptyHeldDice } from "@/lib/yamb/dice";

interface DiceStore {
  dice: Dice;
  heldDice: HeldDice;
  rollCount: number;
  currentRollHistory: Dice[];
  syncFromTurn: (turn: ActiveTurn["turn"] | null) => void;
  reset: () => void;
}

export const useDiceStore = create<DiceStore>((set) => ({
  dice: createEmptyDice(),
  heldDice: createEmptyHeldDice(),
  rollCount: 0,
  currentRollHistory: [],

  syncFromTurn: (turn) => {
    if (!turn) return;
    set({
      dice: [...turn.dice] as Dice,
      heldDice: [...turn.heldDice] as HeldDice,
      rollCount: turn.rollCount,
      currentRollHistory: turn.rollHistory.map((d) => [...d] as Dice),
    });
  },

  reset: () =>
    set({
      dice: createEmptyDice(),
      heldDice: createEmptyHeldDice(),
      rollCount: 0,
      currentRollHistory: [],
    }),
}));
