import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

const DEFAULT_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:3001";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: any;
    token?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = `${DEFAULT_BASE}${path}`;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
  });

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
