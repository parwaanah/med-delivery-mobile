import { useEffect } from "react";
import { useRouter } from "expo-router";
import { isExpoGoClient } from "../lib/expoGo";

function coerceOrderPath(data: any): string | null {
  const orderId = data?.orderId ?? data?.order_id ?? data?.order ?? null;
  const n = orderId != null ? Number(orderId) : NaN;
  if (Number.isFinite(n) && n > 0) return `/orders/${n}`;
  return null;
}

function coercePrescriptionPath(data: any): string | null {
  const presId = data?.prescriptionId ?? data?.prescription_id ?? null;
  const n = presId != null ? Number(presId) : NaN;
  if (Number.isFinite(n) && n > 0) return `/prescriptions/${n}`;
  return null;
}

export function NotificationDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (isExpoGoClient()) return;

    let cleanup: (() => void)[] = [];
    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // Ensure notifications render when received in foreground.
        Notifications.setNotificationHandler({
          handleNotification: async () =>
            ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              // SDK 54+ types
              shouldShowBanner: true,
              shouldShowList: true,
            }) as any,
        });

        const openFromResponse = (resp: any) => {
          if (!resp) return;
          const data = resp?.notification?.request?.content?.data;
          const explicit = typeof data?.path === "string" ? String(data.path) : null;
          const path = explicit || coerceOrderPath(data) || coercePrescriptionPath(data);
          if (path) router.push(path as any);
        };

        // Android channels (dev build only)
        try {
          await Notifications.setNotificationChannelAsync("order_updates", {
            name: "Order updates",
            importance: Notifications.AndroidImportance.HIGH,
          } as any);
          await Notifications.setNotificationChannelAsync("promotions", {
            name: "Promotions",
            importance: Notifications.AndroidImportance.DEFAULT,
          } as any);
        } catch {
          // ignore
        }

        // App opened from a notification tap (cold start).
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled) openFromResponse(last);

        // App already running, user taps notification.
        const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
          openFromResponse(resp);
        });
        cleanup.push(() => sub.remove());

        // Optional: if backend sends a generic "path" field, support it.
        const sub2 = Notifications.addNotificationReceivedListener(() => {});
        cleanup.push(() => sub2.remove());
      } catch {
        // best-effort
      }
    })();

    return () => {
      cancelled = true;
      cleanup.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
      cleanup = [];
    };
  }, [router]);

  return null;
}
