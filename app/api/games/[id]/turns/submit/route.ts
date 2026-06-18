import type { ColumnType, FillableRowKey } from "@/lib/yamb/types";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { submitTurnScore } from "@/server/services/game-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{
      rowKey: FillableRowKey;
      columnType?: ColumnType;
      score?: number;
      isManual?: boolean;
      dojavaAccepted?: boolean;
      overrideRowKey?: FillableRowKey;
    }>(request);

    if (!body.rowKey) {
      throw new Error("rowKey is required");
    }

    return submitTurnScore(id, userId, body);
  });
}
