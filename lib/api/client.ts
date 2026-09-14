const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://localhost:4000/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  accessToken?: string | null;
  cache?: RequestCache;
};

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: options.cache || "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      `Cannot reach API at ${API_URL} (${detail}). Check NEXT_PUBLIC_API_URL / API_URL and that Render is awake.`,
      503,
      { url, cause: detail },
    );
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data as { message?: string | string[] })?.message ||
      res.statusText ||
      "Request failed";
    throw new ApiError(
      Array.isArray(message) ? message.join(", ") : String(message),
      res.status,
      data,
    );
  }

  return data as T;
}

export { API_URL };
