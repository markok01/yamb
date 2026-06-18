type GameListener = (gameId: string, version: number) => void;

const listeners = new Map<string, Set<GameListener>>();

export function subscribeGame(
  gameId: string,
  listener: GameListener
): () => void {
  if (!listeners.has(gameId)) {
    listeners.set(gameId, new Set());
  }
  listeners.get(gameId)!.add(listener);
  return () => listeners.get(gameId)?.delete(listener);
}

export function notifyGameUpdate(gameId: string, version: number) {
  listeners.get(gameId)?.forEach((fn) => fn(gameId, version));
}
