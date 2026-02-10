import * as SecureStore from "expo-secure-store";

export type NotificationPrefs = {
  orderUpdates: boolean;
  promotions: boolean;
};

const KEY = "notification_prefs_v1";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  orderUpdates: true,
  promotions: true,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw) as any;
    return {
      orderUpdates: parsed?.orderUpdates !== false,
      promotions: parsed?.promotions !== false,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export async function setNotificationPrefs(next: NotificationPrefs): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

