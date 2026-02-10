import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { Text, Card, PrimaryButton, colors, spacing, Screen, useToast, HeartRateLoader } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { FlashList } from "@shopify/flash-list";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../components/NetworkStateCard";
import { isExpoGoClient } from "../lib/expoGo";

type NotificationItem = {
  id: number;
  title?: string;
  message?: string;
  createdAt?: string;
  readAt?: string | null;
  type?: string;
  data?: any;
};

export default function NotificationsScreen() {
  const token = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const isExpoGo = isExpoGoClient();

  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await Api.request<NotificationItem[]>("/notifications", { token });
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        return;
      }
      const msg = e?.message || "Failed to load notifications";
      if (offline || /network request failed/i.test(String(msg))) setError("OFFLINE");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, logout, offline]);

  useEffect(() => {
    void load();
  }, [load, retryTick]);

  const markRead = useCallback(async (id: number) => {
    if (!token) return;
    setBusy(true);
    try {
      await Api.request(`/notifications/${id}/read`, { method: "PATCH", token });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        return;
      }
      toast.show(e?.message || "Failed to mark as read");
    } finally {
      setBusy(false);
    }
  }, [logout, toast, token]);

  const markAll = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      await Api.request("/notifications/read-all", { method: "PATCH", token });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      toast.show("All caught up");
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        return;
      }
      toast.show(e?.message || "Failed to mark all as read");
    } finally {
      setBusy(false);
    }
  }, [logout, toast, token]);

  const registerDeviceToken = async () => {
    if (!token) return;
    if (isExpoGo) {
      toast.show("Push requires a development build (Expo Go limitation)");
      return;
    }
    setBusy(true);
    try {
      const Notifications = await import("expo-notifications");
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) {
        const req = await Notifications.requestPermissionsAsync();
        if (!req.granted) {
          toast.show("Notifications permission denied");
          return;
        }
      }

      // In Expo Go (SDK 53+), remote push is not supported. This should throw.
      const pushToken = await Notifications.getDevicePushTokenAsync();
      const deviceId =
        (Constants.deviceName ? String(Constants.deviceName) : null) ||
        (Constants.sessionId ? String(Constants.sessionId) : null);

      await Api.request("/notifications/device-token", {
        method: "POST",
        token,
        body: {
          token: pushToken.data,
          platform: "ANDROID",
          deviceId,
        },
      });
      toast.show("Device registered for push");
    } catch (e: any) {
      toast.show(
        e?.message?.includes("Expo Go")
          ? "Push requires a development build (Expo Go limitation)"
          : e?.message || "Failed to register device"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false}>
      <FlashList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ gap: 2 }}>
                <Text variant="titleLarge">Notifications</Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                </Text>
              </View>
              <Pressable onPress={markAll} disabled={busy || unreadCount === 0}>
                <Text variant="label" color={busy || unreadCount === 0 ? colors.inkMuted : colors.primary}>
                  Mark all read
                </Text>
              </Pressable>
            </View>

            <Card style={{ gap: spacing.sm }}>
              <Text variant="subtitle">Push alerts</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {isExpoGo
                  ? "Remote push is not supported in Expo Go. Use a development build."
                  : "Enable push notifications for order updates."}
              </Text>
              <PrimaryButton
                title={isExpoGo ? "Dev build required" : "Enable push"}
                onPress={registerDeviceToken}
                loading={busy}
                disabled={busy || isExpoGo}
                variant={isExpoGo ? "secondary" : "primary"}
              />
            </Card>

            {loading ? (
              <Card>
                <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: spacing.md }}>
                  <HeartRateLoader width={260} height={72} color={colors.primary} />
                </View>
              </Card>
            ) : error ? (
              <Card style={{ gap: spacing.sm }}>
                {error === "OFFLINE" ? (
                  <NetworkStateCard
                    title={offline ? "You're offline" : "Poor connection"}
                    body="Reconnect and tap retry to refresh."
                    onRetry={() => setRetryTick((v) => v + 1)}
                  />
                ) : (
                  <>
                    <Text variant="body" color={colors.danger}>
                      {error}
                    </Text>
                    <PrimaryButton title="Retry" onPress={() => setRetryTick((v) => v + 1)} />
                  </>
                )}
              </Card>
            ) : items.length === 0 ? (
              <Card>
                <Text variant="body">No notifications yet.</Text>
              </Card>
            ) : null}
          </View>
        }
        renderItem={({ item: n }) => {
          const unread = !n.readAt;
          return (
            <Pressable onPress={() => (unread ? markRead(n.id) : undefined)} disabled={!unread || busy}>
              <Card
                style={{
                  gap: 6,
                  marginBottom: spacing.md,
                  borderWidth: 1,
                  borderColor: unread ? colors.primary : colors.border,
                  backgroundColor: unread ? colors.primarySoft : colors.surface,
                }}
              >
                <Text variant="label">{n.title || n.type || "Update"}</Text>
                <Text variant="body" color={colors.inkMuted}>
                  {n.message || ""}
                </Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </Text>
                {unread ? (
                  <Text variant="caption" color={colors.primary}>
                    Tap to mark read
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          !loading && error === "OFFLINE" && items.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <NetworkStateCard
                title={offline ? "You're offline" : "Poor connection"}
                body="You can still read your notifications. Reconnect and tap retry to refresh."
                onRetry={() => setRetryTick((v) => v + 1)}
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
