import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { joinGame } from "@/server/services/game-service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ roomCode: string }>(request);
    if (!body.roomCode?.trim()) {
      throw new Error("roomCode is required");
    }
    return joinGame(body.roomCode.trim(), userId);
  });
}
