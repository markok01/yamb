import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { getUserLeagues } from "@/server/services/league-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const leagues = await getUserLeagues(userId);
    return { leagues };
  });
}
