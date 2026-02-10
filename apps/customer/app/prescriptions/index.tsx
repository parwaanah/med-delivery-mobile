import { useCallback, useEffect, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Text, Card, PrimaryButton, colors, spacing, Screen, HeartRateLoader } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";

function statusTone(statusRaw: any): { bg: string; fg: string; label: string } {
  const s = String(statusRaw || "").toUpperCase().trim();
  if (s === "APPROVED") return { bg: "rgba(22,142,106,0.12)", fg: colors.primary, label: "Approved" };
  if (s === "REJECTED") return { bg: "rgba(229,57,53,0.12)", fg: colors.danger, label: "Rejected" };
  if (s === "EXPIRED") return { bg: "rgba(41,45,50,0.10)", fg: colors.inkMuted, label: "Expired" };
  return { bg: "rgba(251,176,59,0.14)", fg: colors.ink, label: "Pending" };
}

type Prescription = {
  id: number;
  url: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | string;
  createdAt?: string;
  verifiedAt?: string | null;
  rejectedReason?: string | null;
  expiresAt?: string | null;
};

export default function PrescriptionsListScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !user) {
      router.push("/(auth)/phone");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await Api.request<Prescription[]>("/prescriptions", { token });
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, [token, user, router, logout]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: 140 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="titleLarge">Prescriptions</Text>
          <Pressable onPress={() => router.push("/prescriptions/attach" as any)}>
            <Text variant="label" color={colors.primary}>
              Attach
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <Card>
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: spacing.md }}>
              <HeartRateLoader width={260} height={72} color={colors.primary} />
            </View>
          </Card>
        ) : error ? (
          <Card style={{ gap: spacing.sm }}>
            <Text variant="body" color={colors.danger}>
              {error}
            </Text>
            <PrimaryButton title="Retry" onPress={load} />
          </Card>
        ) : items.length === 0 ? (
          <Card style={{ gap: spacing.sm }}>
            <Text variant="subtitle">No prescriptions yet</Text>
            <Text variant="body" color={colors.inkMuted}>
              When you upload a prescription for an order, it will appear here.
            </Text>
            <PrimaryButton title="Attach to an order" onPress={() => router.push("/prescriptions/attach" as any)} />
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {items.map((p) => (
              <Pressable key={p.id} onPress={() => router.push(`/prescriptions/${p.id}` as any)}>
                <Card style={{ gap: 6, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text variant="subtitle">Prescription #{p.id}</Text>
                    {(() => {
                      const t = statusTone(p.status);
                      return (
                        <View
                          style={{
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
                  </View>
                  <Text variant="caption" color={colors.inkMuted}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
