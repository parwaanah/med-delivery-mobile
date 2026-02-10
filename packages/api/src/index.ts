import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

const DEFAULT_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:3001";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: any;
  token?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${DEFAULT_BASE}${path}`;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const controller = new AbortController();
  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 12_000;
  const timeout = setTimeout(() => controller.abort(), Math.max(0, timeoutMs));

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    const err: any = e instanceof Error ? e : new Error("Network error");
    if (err?.name === "AbortError") {
      err.code = "ETIMEDOUT";
      err.message = "Request timed out";
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = json?.message || `Request failed (${res.status})`;
    // Attach status/data so callers can handle 401s without string-matching.
    const err: any = new Error(message);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json as T;
}

export const Api = {
  baseUrl: DEFAULT_BASE,
  request,
};
