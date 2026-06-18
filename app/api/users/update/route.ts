import { handleApi, parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { updateUserProfile } from "@/server/services/user-service";

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const body = await parseJson<{
      displayName?: string;
      avatarUrl?: string | null;
    }>(request);
    const user = await updateUserProfile(userId, body);
    return { user };
  });
}
