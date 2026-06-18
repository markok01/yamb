import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { rollDice } from "@/server/services/game-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    return rollDice(id, userId);
  });
}
