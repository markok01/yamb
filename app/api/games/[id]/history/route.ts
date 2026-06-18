import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { getGameHistoryDetail } from "@/server/services/history-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    return getGameHistoryDetail(id, userId);
  });
}
