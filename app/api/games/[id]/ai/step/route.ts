import type { AiDifficulty } from "@/lib/yamb/ai-player";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { runAiStep } from "@/server/services/ai-game-service";

function parseDifficulty(value: unknown): AiDifficulty {
  if (value === "easy" || value === "hard") return value;
  return "medium";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await context.params;

  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ difficulty?: AiDifficulty }>(request);
    return runAiStep(gameId, userId, parseDifficulty(body.difficulty));
  });
}
