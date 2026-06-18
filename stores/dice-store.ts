import { create } from "zustand";
import type { Dice, HeldDice } from "@/lib/yamb/types";
import type { ActiveTurn } from "@/lib/api/types";

interface DiceStore {
  dice: Dice;
  heldDice: HeldDice;
  rollCount: number;
  currentRollHistory: Dice[];
  syncFromTurn: (turn: ActiveTurn["turn"] | null) => void;
  reset: () => void;
}

const EMPTY_DICE: Dice = [0, 0, 0, 0, 0];
const EMPTY_HELD: HeldDice = [false, false, false, false, false];

export const useDiceStore = create<DiceStore>((set) => ({
  dice: EMPTY_DICE,
  heldDice: EMPTY_HELD,
  rollCount: 0,
  currentRollHistory: [],

  syncFromTurn: (turn) => {
    if (!turn) {
      set({
        dice: EMPTY_DICE,
        heldDice: EMPTY_HELD,
        rollCount: 0,
        currentRollHistory: [],
      });
      return;
    }
    set({
      dice: [...turn.dice] as Dice,
      heldDice: [...turn.heldDice] as HeldDice,
      rollCount: turn.rollCount,
      currentRollHistory: turn.rollHistory.map((d) => [...d] as Dice),
    });
  },

  reset: () =>
    set({
      dice: EMPTY_DICE,
      heldDice: EMPTY_HELD,
      rollCount: 0,
      currentRollHistory: [],
    }),
}));
