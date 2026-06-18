import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { createLeague } from "@/server/services/league-service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ name: string; season: string; description?: string }>(request);
    const league = await createLeague(userId, body);
    return { league };
  }, 201);
}
