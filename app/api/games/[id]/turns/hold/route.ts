import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { toggleHold } from "@/server/services/game-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ index: number }>(request);
    if (body.index === undefined || body.index < 0 || body.index > 4) {
      throw new Error("index must be 0-4");
    }
    return toggleHold(id, userId, body.index);
  });
}
