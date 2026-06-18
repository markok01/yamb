import { handleApi } from "@/server/lib/handle-api";
import { getLeaderboard } from "@/server/services/game-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(() => getLeaderboard(id));
}
