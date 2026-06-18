import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import {
  getGameHistory,
  getOpponentHistory,
} from "@/server/services/history-service";
import { ApiError } from "@/server/lib/api-error";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    if (userId !== id) {
      throw new ApiError(403, "FORBIDDEN", "Možete videti samo svoju istoriju");
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    const [games, opponents] = await Promise.all([
      getGameHistory(id, limit, offset),
      getOpponentHistory(id),
    ]);

    return { ...games, opponents };
  });
}
