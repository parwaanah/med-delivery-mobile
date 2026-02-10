import { useEffect, useState } from "react";
import { View, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Text, Card, PrimaryButton, colors, spacing, ScreenScroll, HeartRateLoader, useToast } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";

type LegalConfig = {
  version?: string;
  termsUrl?: string;
  privacyUrl?: string;
  required?: boolean;
};

export default function LegalScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<LegalConfig | null>(null);
  const [accepted, setAccepted] = useState(false);

  const load = async () => {
    if (!token) {
      router.replace("/(auth)/phone");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const c = await Api.request<LegalConfig>("/legal/config", { token });
      setConfig(c || null);
      const s = await Api.request<any>("/legal/status", { token });
      setAccepted(Boolean(s?.accepted));
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to load legal info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const accept = async () => {
    if (!token) return;
    const version = String(config?.version || "").trim();
    if (!version) {
      toast.show("No version available");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await Api.request("/legal/accept", { method: "POST", token, body: { version } });
      setAccepted(true);
      toast.show("Accepted");
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to accept");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Terms & Privacy</Text>

      {loading ? (
        <Card style={{ alignItems: "center", paddingVertical: spacing.lg }}>
          <HeartRateLoader width={260} height={72} color={colors.primary} />
        </Card>
      ) : error ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="body" color={colors.danger}>
            {error}
          </Text>
          <PrimaryButton title="Retry" onPress={load} />
        </Card>
      ) : (
        <>
          <Card style={{ gap: spacing.sm }}>
            <Text variant="subtitle">Current version</Text>
            <Text variant="body">{config?.version || "—"}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  if (config?.termsUrl) Linking.openURL(config.termsUrl);
                }}
              >
                <Text variant="label" color={config?.termsUrl ? colors.primary : colors.inkMuted}>
                  View terms
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (config?.privacyUrl) Linking.openURL(config.privacyUrl);
                }}
              >
                <Text variant="label" color={config?.privacyUrl ? colors.primary : colors.inkMuted}>
                  View privacy
                </Text>
              </Pressable>
            </View>
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <Text variant="subtitle">Status</Text>
            <Text variant="body" color={accepted ? colors.success : colors.danger}>
              {accepted ? "Accepted" : "Not accepted"}
            </Text>
            {!accepted ? (
              <PrimaryButton title="Accept" onPress={accept} loading={busy} />
            ) : (
              <PrimaryButton title="Back" variant="secondary" onPress={() => router.back()} />
            )}
          </Card>
        </>
      )}
    </ScreenScroll>
  );
}

