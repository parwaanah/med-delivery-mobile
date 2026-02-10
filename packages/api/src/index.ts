import { QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

export const queryClient = new QueryClient();

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

const ENV_BASE = String(process.env.EXPO_PUBLIC_API_BASE || "").trim();

const DEFAULT_CANDIDATES = [
  ENV_BASE ? stripTrailingSlash(ENV_BASE) : null,
  Platform.OS === "android" ? "http://10.0.2.2:3001" : null, // Android emulator -> host loopback
  "http://localhost:3001",
].filter(Boolean) as string[];

let resolvedBase: string | null = DEFAULT_CANDIDATES[0] || null;

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: any;
  token?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

async function getMoreCandidatesFromExpo(): Promise<string[]> {
  try {
    // Optional dependency, but installed in the app.
    const Constants = (await import("expo-constants")).default as any;
    const hostUri =
      String(Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost || "").trim() ||
      String(Constants?.debuggerHost || "").trim();

    // Examples:
    // - "192.168.31.52:8084"
    // - "10.0.2.2:8084"
    // - "192.168.31.52"
    if (!hostUri) return [];

    const host = hostUri.split(",")[0].trim();
    const hostOnly = host.includes(":") ? host.split(":")[0] : host;
    if (!hostOnly) return [];

    return [
      `http://${hostOnly}:3001`,
      // Some setups expose backend on 3001 without http proxying.
      `http://${hostOnly}:3001`,
    ].map(stripTrailingSlash);
  } catch {
    return [];
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const controller = new AbortController();
  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 12_000;
  const timeout = setTimeout(() => controller.abort(), Math.max(0, timeoutMs));

  const tryFetch = async (base: string): Promise<Response> => {
    const url = `${stripTrailingSlash(base)}${path}`;
    return fetch(url, {
      method: options.method || "GET",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
      signal: controller.signal,
    });
  };

  let res: Response | null = null;
  try {
    const bases = resolvedBase ? [resolvedBase] : [];
    const extras = await getMoreCandidatesFromExpo();
    const candidates = Array.from(new Set([...bases, ...DEFAULT_CANDIDATES, ...extras]));

    let lastErr: any = null;
    for (const base of candidates) {
      try {
        res = await tryFetch(base);
        resolvedBase = base;
        break;
      } catch (e: any) {
        lastErr = e;
        // If we timed out, no point trying other bases during the same timeout window.
        if (e?.name === "AbortError") throw e;
      }
    }

    if (!res) throw lastErr || new Error("Network error");
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
  baseUrl: resolvedBase || DEFAULT_CANDIDATES[0] || "http://localhost:3001",
  request,
};
