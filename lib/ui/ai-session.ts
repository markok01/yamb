import type { AiDifficulty } from "@/lib/yamb/ai-player";

const STORAGE_PREFIX = "yamb-ai-";

export function storeAiDifficulty(gameId: string, difficulty: AiDifficulty) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${gameId}`, difficulty);
}

export function getAiDifficulty(gameId: string): AiDifficulty | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
  if (value === "easy" || value === "medium" || value === "hard") return value;
  return null;
}

export function parseAiDifficultyParam(
  value: string | null
): AiDifficulty | null {
  if (value === "easy" || value === "medium" || value === "hard") return value;
  return null;
}

export function resolveAiDifficulty(
  gameId: string,
  urlParam: string | null,
  hasAiPlayer: boolean
): AiDifficulty | null {
  const fromUrl = parseAiDifficultyParam(urlParam);
  if (fromUrl) {
    storeAiDifficulty(gameId, fromUrl);
    return fromUrl;
  }
  const stored = getAiDifficulty(gameId);
  if (stored) return stored;
  return hasAiPlayer ? "medium" : null;
}
