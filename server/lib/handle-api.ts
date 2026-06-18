import { NextResponse } from "next/server";
import { ApiError } from "./api-error";

export async function handleApi<T>(
  handler: () => Promise<T>,
  successStatus = 200
) {
  try {
    const data = await handler();
    return NextResponse.json(data, { status: successStatus });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.errorCode,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error(error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Interna greška servera",
      },
      { status: 500 }
    );
  }
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Nevalidan JSON body");
  }
}
