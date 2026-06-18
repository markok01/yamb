import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { removeMember } from "@/server/services/league-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId: targetUserId } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    return removeMember(id, userId, targetUserId);
  });
}
