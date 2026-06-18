import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import {
  addMemberByUsername,
  removeMember,
  transferOwnership,
  promoteMember,
} from "@/server/services/league-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ username: string }>(request);
    return addMemberByUsername(id, userId, body.username);
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{
      action: "transfer" | "promote";
      targetUserId: string;
      role?: "ADMIN" | "MEMBER";
    }>(request);

    if (body.action === "transfer") {
      return transferOwnership(id, userId, body.targetUserId);
    }
    return promoteMember(id, userId, body.targetUserId, body.role ?? "ADMIN");
  });
}
