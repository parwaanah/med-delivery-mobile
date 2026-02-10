import * as SecureStore from "expo-secure-store";

// NOTE: We intentionally avoid `react-native-mmkv` here because it requires a dev build
// (native modules) and crashes in Expo Go.

const KEY = "recent_searches_v1";
const LIMIT = 12;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string" && s.trim().length) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(value: string): Promise<void> {
  const v = value.trim();
  if (!v) return;
  const prev = await getRecentSearches();
  const next = [v, ...prev.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, LIMIT);
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
