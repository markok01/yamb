import type { ApiErrorBody } from "./types";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function parseError(res: Response): Promise<ApiClientError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiClientError(
      res.status,
      body.error ?? "UNKNOWN",
      body.message ?? "Greška"
    );
  } catch {
    return new ApiClientError(res.status, "UNKNOWN", "Greška na serveru");
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { userId?: string | null } = {}
): Promise<T> {
  const { userId, headers, ...rest } = options;
  const res = await fetch(path, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json() as Promise<T>;
}
