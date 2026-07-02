export class ApiError extends Error {
  readonly status: number;
  readonly upgrade: boolean;

  constructor(message: string, status: number, upgrade = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.upgrade = upgrade;
  }
}

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  upgrade?: boolean;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  let body: ApiEnvelope<T>;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("Unexpected server response. Please try again.", response.status);
  }
  if (!response.ok || body.error) {
    throw new ApiError(
      body.error ?? "Something went wrong. Please try again.",
      response.status,
      body.upgrade ?? false
    );
  }
  return body.data as T;
}
