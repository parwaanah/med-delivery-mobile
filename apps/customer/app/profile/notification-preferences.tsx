import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Card, Screen, Text, colors, spacing } from "@mobile/ui";
import { getNotificationPrefs, setNotificationPrefs, type NotificationPrefs } from "../../lib/notificationPrefs";
import { useAuthStore } from "@mobile/auth";
import { Api } from "@mobile/api";

export default function NotificationPreferencesScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getNotificationPrefs();
      if (!cancelled) setPrefs(p);

      // Best-effort pull server prefs (if any) and merge with local.
      if (token) {
        try {
          const remote = await Api.request<any>("/notifications/preferences", { token });
          const merged: NotificationPrefs = {
            orderUpdates: remote?.orderUpdates !== false && p.orderUpdates !== false,
            promotions: remote?.promotions !== false && p.promotions !== false,
          };
          if (!cancelled) setPrefs(merged);
          await setNotificationPrefs(merged);
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const update = async (next: NotificationPrefs) => {
    setPrefs(next);
    await setNotificationPrefs(next);
    if (token) {
      try {
        await Api.request("/notifications/preferences", {
          method: "POST",
          token,
          body: next,
        });
      } catch {
        // ignore
      }
    }
  };

  return (
    <Screen>
      <Text variant="titleLarge" style={{ marginBottom: spacing.md }}>
        Notification Preferences
      </Text>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="subtitle">Order updates</Text>
            <Text variant="caption" color={colors.inkMuted}>
              Payment requests, order status changes, prescription updates.
            </Text>
          </View>
          <Switch
            value={prefs?.orderUpdates !== false}
            onValueChange={(v) => {
              const next = { ...(prefs || { orderUpdates: true, promotions: true }), orderUpdates: Boolean(v) };
              update(next);
            }}
          />
        </View>

        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="subtitle">Promotions</Text>
            <Text variant="caption" color={colors.inkMuted}>
              Offers, banners, and marketing notifications.
            </Text>
          </View>
          <Switch
            value={prefs?.promotions !== false}
            onValueChange={(v) => {
              const next = { ...(prefs || { orderUpdates: true, promotions: true }), promotions: Boolean(v) };
              update(next);
            }}
          />
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Text variant="caption" color={colors.inkMuted}>
          Note: Remote push requires a development build. These toggles also affect in-app notifications behavior.
        </Text>
      </View>
    </Screen>
  );
}
