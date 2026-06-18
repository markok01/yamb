import { handleApi } from "@/server/lib/handle-api";
import { computeHeadToHead } from "@/server/services/league-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; opponentId: string }> }
) {
  const { id, opponentId } = await context.params;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    throw new Error("userId query param required");
  }
  return handleApi(() => computeHeadToHead(id, userId, opponentId));
}
