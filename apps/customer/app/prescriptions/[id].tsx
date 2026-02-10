import { useCallback, useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Card, PrimaryButton, colors, spacing, ScreenScroll, HeartRateLoader } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import * as Linking from "expo-linking";

function statusTone(statusRaw: any): { bg: string; fg: string; label: string } {
  const s = String(statusRaw || "").toUpperCase().trim();
  if (s === "APPROVED") return { bg: "rgba(22,142,106,0.12)", fg: colors.primary, label: "Approved" };
  if (s === "REJECTED") return { bg: "rgba(229,57,53,0.12)", fg: colors.danger, label: "Rejected" };
  if (s === "EXPIRED") return { bg: "rgba(41,45,50,0.10)", fg: colors.inkMuted, label: "Expired" };
  return { bg: "rgba(251,176,59,0.14)", fg: colors.ink, label: "Pending" };
}

type PrescriptionDetail = {
  id: number;
  url: string;
  status: string;
  createdAt?: string;
  verifiedAt?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  expiresAt?: string | null;
  orders?: { id: number; status?: string; createdAt?: string }[];
};

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const [item, setItem] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await Api.request<PrescriptionDetail>(`/prescriptions/${id}`, { token });
      setItem(res);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to load prescription");
    } finally {
      setLoading(false);
    }
  }, [token, id, logout, router]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <HeartRateLoader width={260} height={72} color={colors.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <ScreenScroll contentStyle={{ gap: spacing.lg }}>
        <Text variant="titleLarge">Prescription</Text>
        <Card style={{ gap: spacing.sm }}>
          <Text variant="body" color={colors.danger}>
            {error || "Not found"}
          </Text>
          <PrimaryButton title="Retry" onPress={load} />
        </Card>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Prescription #{item.id}</Text>

      <Card style={{ gap: 6 }}>
        <Text variant="subtitle">Status</Text>
        {(() => {
          const t = statusTone(item.status);
          return (
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: t.bg,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="caption" color={t.fg}>
                {t.label}
              </Text>
            </View>
          );
        })()}
        <Text variant="caption" color={colors.inkMuted}>
          Created: {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
        </Text>
        {item.verifiedAt ? (
          <Text variant="caption" color={colors.inkMuted}>
            Verified: {new Date(item.verifiedAt).toLocaleString()}
          </Text>
        ) : null}
        {item.rejectedAt ? (
          <Text variant="caption" color={colors.inkMuted}>
            Rejected: {new Date(item.rejectedAt).toLocaleString()}
          </Text>
        ) : null}
        {item.rejectedReason ? (
          <Text variant="body" color={colors.danger}>
            Reason: {item.rejectedReason}
          </Text>
        ) : null}
        {item.expiresAt ? (
          <Text variant="caption" color={colors.inkMuted}>
            Expires: {new Date(item.expiresAt).toLocaleString()}
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">File</Text>
        <Text variant="caption" color={colors.inkMuted} numberOfLines={2}>
          {item.url}
        </Text>
        <PrimaryButton
          title="Open file"
          onPress={() => {
            if (item.url) Linking.openURL(item.url);
          }}
        />
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Linked orders</Text>
        {Array.isArray(item.orders) && item.orders.length > 0 ? (
          item.orders.map((o) => (
            <Pressable key={o.id} onPress={() => router.push(`/orders/${o.id}`)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                <Text variant="label">Order #{o.id}</Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {o.status || ""}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text variant="caption" color={colors.inkMuted}>
            Not linked to any order yet.
          </Text>
        )}
      </Card>
    </ScreenScroll>
  );
}
