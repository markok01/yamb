"use client";

import type { GameState } from "@/lib/api/types";
import type { AiDifficulty } from "@/lib/yamb/ai-player";
import { VirtualGameBoard } from "@/components/game/virtual-game-board";
import { PhysicalGameBoard } from "@/components/game/physical-game-board";

interface GameBoardProps {
  gameId: string;
  userId: string;
  state: GameState;
  aiDifficulty?: AiDifficulty | null;
}

export function GameBoard({
  gameId,
  userId,
  state,
  aiDifficulty = null,
}: GameBoardProps) {
  if (state.game.diceMode === "PHYSICAL") {
    return (
      <PhysicalGameBoard gameId={gameId} userId={userId} state={state} />
    );
  }
  return (
    <VirtualGameBoard
      gameId={gameId}
      userId={userId}
      state={state}
      aiDifficulty={aiDifficulty}
    />
  );
}
