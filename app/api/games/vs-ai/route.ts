import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { createGameVsAi } from "@/server/services/ai-game-service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    await parseJson(request);
    return createGameVsAi(userId);
  }, 201);
}
