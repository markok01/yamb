import type { ColumnType } from "@/lib/yamb/types";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { startPlayerTurn } from "@/server/services/game-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ columnType: ColumnType }>(request);
    if (!body.columnType) {
      throw new Error("columnType is required");
    }
    return startPlayerTurn(id, userId, body.columnType);
  }, 201);
}
