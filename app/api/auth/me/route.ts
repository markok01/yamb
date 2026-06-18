import { handleApi } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { getUserById } from "@/server/services/auth-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId(request);
    const user = await getUserById(userId);
    return { user };
  });
}
