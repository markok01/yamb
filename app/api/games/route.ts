import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { createGame } from "@/server/services/game-service";
import type { DiceMode } from "@/lib/yamb/types";

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ diceMode?: DiceMode }>(request);
    const diceMode = body.diceMode === "PHYSICAL" ? "PHYSICAL" : "VIRTUAL";
    return createGame(userId, diceMode);
  }, 201);
}
