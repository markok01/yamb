import { ApiError } from "@/server/lib/api-error";
import { handleApi, parseJson } from "@/server/lib/handle-api";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/server/lib/session";
import { registerUser } from "@/server/services/auth-service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await parseJson<{
      email: string;
      password: string;
      displayName: string;
    }>(request);

    const { user, token } = await registerUser(body);
    const response = NextResponse.json({ user }, { status: 201 });
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
