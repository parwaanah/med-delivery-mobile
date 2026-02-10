import { useEffect, useMemo, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import { useQuery } from "@tanstack/react-query";
import { Api } from "@mobile/api";
import { useToast } from "@mobile/ui";
import { useRouter } from "expo-router";
import { getNotificationPrefs } from "../lib/notificationPrefs";

type NotificationItem = {
  id: number;
  type?: string;
  message?: string;
  status?: string;
  createdAt?: string;
  meta?: any;
};

function normalize(v: any) {
  return String(v || "").trim().toLowerCase();
}

export function NotificationPoller({
  token,
  userId,
}: {
  token: string | null | undefined;
  userId: number | null | undefined;
}) {
  const toast = useToast();
  const router = useRouter();
  const lastToastIdRef = useRef<number | null>(null);
  const prefsRef = useRef<{ orderUpdates: boolean; promotions: boolean } | null>(null);

  const enabled = Boolean(token) && Boolean(userId);
  const cacheKey = useMemo(() => (userId ? `notif_last_toast_${userId}` : null), [userId]);

  const query = useQuery({
    queryKey: ["notifications", "poll", userId],
    enabled,
    queryFn: () => Api.request<NotificationItem[]>("/notifications", { token: token || undefined }),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const unread = useMemo(() => {
    const list = Array.isArray(query.data) ? query.data : [];
    return list.filter((n) => normalize(n.status) !== "read");
  }, [query.data]);

  const latestPaymentRequest = useMemo(() => {
    return unread.find((n) => normalize(n.type) === "payment.requested") || null;
  }, [unread]);

  useEffect(() => {
    if (!enabled || !cacheKey) return;
    if (!latestPaymentRequest?.id) return;

    let cancelled = false;
    (async () => {
      if (!prefsRef.current) prefsRef.current = await getNotificationPrefs();
      if (prefsRef.current?.orderUpdates === false) return;

      const stored = await SecureStore.getItemAsync(cacheKey).catch(() => null);
      const storedId = stored ? Number(stored) : NaN;
      const lastStoredId = Number.isFinite(storedId) ? storedId : null;

      const currentId = Number(latestPaymentRequest.id);
      if (!Number.isFinite(currentId)) return;

      // Avoid double-toasting in the same session
      if (lastToastIdRef.current === currentId) return;

      // Only toast if it's newer than what we already acknowledged
      if (lastStoredId != null && currentId <= lastStoredId) return;

      if (cancelled) return;
      lastToastIdRef.current = currentId;

      const orderId =
        latestPaymentRequest?.meta?.orderId != null ? Number(latestPaymentRequest.meta.orderId) : null;

      toast.show(latestPaymentRequest.message || "Payment requested");

      if (orderId) {
        // Best-effort: take user to order details so they can pay.
        // (We keep it non-blocking; the toast is the main signal.)
        setTimeout(() => {
          try {
            router.push(`/orders/${orderId}`);
          } catch {
            // ignore
          }
        }, 350);
      }

      await SecureStore.setItemAsync(cacheKey, String(currentId)).catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, cacheKey, latestPaymentRequest?.id, latestPaymentRequest?.message, latestPaymentRequest?.meta, toast, router]);

  return null;
}
