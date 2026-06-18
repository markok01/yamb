import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { getUserStats } from "@/server/services/stats-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    return getUserStats(userId);
  });
}
