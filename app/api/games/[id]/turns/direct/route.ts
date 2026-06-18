import type { FillableRowKey } from "@/lib/yamb/types";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { directPlay } from "@/server/services/game-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ rowKey: FillableRowKey }>(request);
    if (!body.rowKey) {
      throw new Error("rowKey is required");
    }
    return directPlay(id, userId, body.rowKey);
  });
}
