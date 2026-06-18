import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { joinLeague, joinLeagueByCode } from "@/server/services/league-service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ leagueId?: string; inviteCode?: string }>(request);
    if (body.inviteCode) {
      const league = await joinLeagueByCode(body.inviteCode, userId);
      return { league };
    }
    if (!body.leagueId) throw new Error("leagueId or inviteCode required");
    const league = await joinLeague(body.leagueId, userId);
    return { league };
  });
}
