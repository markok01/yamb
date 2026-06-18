import { ApiError } from "@/server/lib/api-error";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import { setSessionCookie } from "@/server/lib/session";
import { loginUser } from "@/server/services/auth-service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await parseJson<{ email: string; password: string }>(request);
    const { user, token } = await loginUser(body.email, body.password);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
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
