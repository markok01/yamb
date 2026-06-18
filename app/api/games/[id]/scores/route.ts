import type { FillableRowKey, ColumnType } from "@/lib/yamb/types";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { correctScoreEntry } from "@/server/services/game-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{
      columnType: ColumnType;
      rowKey: FillableRowKey;
      score: number;
    }>(request);

    if (!body.columnType || !body.rowKey || body.score === undefined) {
      throw new Error("columnType, rowKey and score are required");
    }

    return correctScoreEntry(id, userId, body);
  });
}
