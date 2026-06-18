import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import {
  deleteLeague,
  getLeague,
  updateLeague,
} from "@/server/services/league-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const league = await getLeague(id, userId);
    return { league };
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
      name?: string;
      season?: string;
      description?: string | null;
      maxMembers?: number;
      imageUrl?: string | null;
      isPublic?: boolean;
    }>(request);
    const league = await updateLeague(id, userId, body);
    return { league };
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{ confirmName: string }>(request);
    return deleteLeague(id, userId, body.confirmName);
  });
}
