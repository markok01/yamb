import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { cancelLeagueGame } from "@/server/services/league-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; gameId: string }> }
) {
  const { id, gameId } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    return cancelLeagueGame(id, gameId, userId);
  });
}
