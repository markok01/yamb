import type { FillableRowKey } from "@/lib/yamb/types";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { submitPhysicalTurnScore } from "@/server/services/game-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{
      rowKey: FillableRowKey;
      score: number;
      dice?: number[];
    }>(request);

    if (!body.rowKey || body.score === undefined) {
      throw new Error("rowKey and score are required");
    }

    return submitPhysicalTurnScore(id, userId, body);
  });
}
