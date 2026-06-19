import type { DiceMode } from "@/lib/yamb/types";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import {
  createLeagueGame,
  getActiveLeagueGames,
} from "@/server/services/league-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    return getActiveLeagueGames(id, userId);
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{
      memberUserIds: string[];
      diceMode?: DiceMode;
    }>(request);

    if (!body.memberUserIds?.length) {
      throw new Error("memberUserIds is required");
    }

    return createLeagueGame(id, userId, {
      memberUserIds: body.memberUserIds,
      diceMode: body.diceMode,
    });
  });
}
