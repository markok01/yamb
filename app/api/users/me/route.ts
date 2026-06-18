import { NextResponse } from "next/server";
import { ApiError } from "@/server/lib/api-error";
import { parseJson } from "@/server/lib/handle-api";
import { requireUserId } from "@/server/lib/auth";
import { clearSessionCookie } from "@/server/lib/session";
import { deleteUserAccount } from "@/server/services/user-service";

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = await parseJson<{ confirmText: string }>(request);
    if (!body.confirmText?.trim()) {
      throw new ApiError(400, "CONFIRM_REQUIRED", "Potvrda je obavezna");
    }
    await deleteUserAccount(userId, body.confirmText);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.errorCode, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interna greška servera" },
      { status: 500 }
    );
  }
}
