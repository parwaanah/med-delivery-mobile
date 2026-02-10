import Constants from "expo-constants";

// Expo Go restrictions matter for a few features (remote push, some native modules).
// We keep a single, conservative detector to avoid accidental runtime crashes.
export function isExpoGoClient(): boolean {
  const executionEnv = (Constants as any).executionEnvironment as string | undefined;
  return Constants.appOwnership === "expo" || executionEnv === "storeClient";
}

