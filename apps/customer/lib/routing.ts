export type LatLng = { latitude: number; longitude: number };

export type RouteResult = {
  provider: "osrm";
  distanceMeters: number;
  durationSeconds: number;
  polyline: LatLng[];
};

type CacheEntry = { at: number; key: string; value: RouteResult };

// Simple in-memory cache (good enough for one screen/session).
let last: CacheEntry | null = null;

function roundCoord(n: number) {
  // ~11m precision at equator
  return Math.round(n * 1e4) / 1e4;
}

function cacheKey(a: LatLng, b: LatLng) {
  return `${roundCoord(a.latitude)},${roundCoord(a.longitude)}->${roundCoord(b.latitude)},${roundCoord(b.longitude)}`;
}

export async function getRouteOsrm(
  from: LatLng,
  to: LatLng,
  opts: { signal?: AbortSignal; timeoutMs?: number; cacheTtlMs?: number } = {}
): Promise<RouteResult> {
  const key = cacheKey(from, to);
  const ttl = opts.cacheTtlMs ?? 15_000;
  const now = Date.now();

  if (last && last.key === key && now - last.at < ttl) {
    return last.value;
  }

  const baseUrl = process.env.EXPO_PUBLIC_OSRM_BASE || "https://router.project-osrm.org";
  const url =
    `${baseUrl}/route/v1/driving/` +
    `${encodeURIComponent(`${from.longitude},${from.latitude}`)};${encodeURIComponent(`${to.longitude},${to.latitude}`)}` +
    `?overview=full&geometries=geojson&alternatives=false&steps=false`;

  const timeoutMs = opts.timeoutMs ?? 6_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const signal = opts.signal;
  const abortHandler = () => controller.abort();
  if (signal) signal.addEventListener("abort", abortHandler, { once: true });

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    const json = (await res.json()) as any;

    const route = Array.isArray(json?.routes) ? json.routes[0] : null;
    const coords = route?.geometry?.coordinates;
    if (!route || !Array.isArray(coords)) throw new Error("Routing failed (bad response)");

    const polyline: LatLng[] = coords
      .map((p: any) => {
        const lon = Array.isArray(p) ? Number(p[0]) : NaN;
        const lat = Array.isArray(p) ? Number(p[1]) : NaN;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return { latitude: lat, longitude: lon };
      })
      .filter(Boolean) as LatLng[];

    const out: RouteResult = {
      provider: "osrm",
      distanceMeters: Number(route.distance) || 0,
      durationSeconds: Number(route.duration) || 0,
      polyline,
    };

    last = { at: now, key, value: out };
    return out;
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", abortHandler as any);
  }
}

