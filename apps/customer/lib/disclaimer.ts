import * as SecureStore from "expo-secure-store";

const KEY = "medical_disclaimer_ack_v1";

export async function isDisclaimerAccepted() {
  const v = await SecureStore.getItemAsync(KEY);
  return v === "1";
}

export async function setDisclaimerAccepted() {
  await SecureStore.setItemAsync(KEY, "1");
}

