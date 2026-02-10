import * as SecureStore from "expo-secure-store";

const KEY = "onboarding_done_v1";

export async function isOnboardingDone() {
  const v = await SecureStore.getItemAsync(KEY);
  return v === "1";
}

export async function setOnboardingDone() {
  await SecureStore.setItemAsync(KEY, "1");
}

