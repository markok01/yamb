import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GamePreferencesState {
  /** Predlozi dojave, pulsirajuća polja i sistemski rezultat u virtuelnim kockicama */
  virtualPlayHints: boolean;
  setVirtualPlayHints: (enabled: boolean) => void;
}

export const useGamePreferencesStore = create<GamePreferencesState>()(
  persist(
    (set) => ({
      virtualPlayHints: true,
      setVirtualPlayHints: (enabled) => set({ virtualPlayHints: enabled }),
    }),
    { name: "yamb-game-preferences" }
  )
);
