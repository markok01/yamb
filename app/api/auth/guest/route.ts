import { ApiError } from "@/server/lib/api-error";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { createGuestUser } from "@/server/services/game-service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const body = await parseJson<{ displayName: string }>(request);
    if (!body.displayName?.trim()) {
      throw new ApiError(400, "INVALID_INPUT", "Ime za prikaz je obavezno");
    }
    const user = await createGuestUser(body.displayName.trim());
    return { user };
  }, 201);
}
