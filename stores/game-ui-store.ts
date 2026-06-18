import { create } from "zustand";
import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";

interface GameUiState {
  selectedColumn: ColumnType | null;
  pendingNajavaRow: FillableRowKey | null;
  manualScore: string;
  dojavaRejected: boolean;
  errorMessage: string | null;
  setSelectedColumn: (col: ColumnType | null) => void;
  setPendingNajavaRow: (row: FillableRowKey | null) => void;
  setManualScore: (score: string) => void;
  setDojavaRejected: (rejected: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  resetTurnUi: () => void;
}

export const useGameUiStore = create<GameUiState>((set) => ({
  selectedColumn: null,
  pendingNajavaRow: null,
  manualScore: "",
  dojavaRejected: false,
  errorMessage: null,
  setSelectedColumn: (selectedColumn) => set({ selectedColumn }),
  setPendingNajavaRow: (pendingNajavaRow) => set({ pendingNajavaRow }),
  setManualScore: (manualScore) => set({ manualScore }),
  setDojavaRejected: (dojavaRejected) => set({ dojavaRejected }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  resetTurnUi: () =>
    set({
      selectedColumn: null,
      pendingNajavaRow: null,
      manualScore: "",
      dojavaRejected: false,
      errorMessage: null,
    }),
}));
