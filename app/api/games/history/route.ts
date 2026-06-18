import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { getGameHistory } from "@/server/services/history-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    return getGameHistory(userId, limit, offset);
  });
}
