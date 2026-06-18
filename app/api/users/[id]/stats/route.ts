import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { getUserStats } from "@/server/services/stats-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    if (userId !== id) {
      const { ApiError } = await import("@/server/lib/api-error");
      throw new ApiError(403, "FORBIDDEN", "Možete videti samo svoju statistiku");
    }
    return getUserStats(id);
  });
}
