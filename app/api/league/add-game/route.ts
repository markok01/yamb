import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { addGameToLeague } from "@/server/services/league-service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ leagueId: string; gameId: string }>(request);
    return addGameToLeague(body.leagueId, body.gameId, userId);
  });
}
