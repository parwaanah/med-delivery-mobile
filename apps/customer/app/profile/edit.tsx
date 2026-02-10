import { useEffect, useMemo, useState } from "react";
import { View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@mobile/auth";
import { Text, Card, Input, PrimaryButton, colors, spacing, ScreenScroll } from "@mobile/ui";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../../components/NetworkStateCard";
import { Ionicons } from "@expo/vector-icons";

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const updateMe = useAuthStore((s) => s.updateMe);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!token) router.replace("/(auth)/phone");
  }, [token, router]);

  const canSave = useMemo(() => {
    const nm = name.trim();
    const em = email.trim();
    if (nm.length < 2) return false;
    if (!em) return true;
    // Basic email sanity check (backend will validate fully if needed)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
  }, [name, email]);

  const onSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await updateMe({ name: name.trim(), email: email.trim() || undefined });
      router.back();
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenScroll contentStyle={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="titleLarge">Edit Profile</Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="close" size={18} color={colors.inkMuted} />
          </Pressable>
        </View>

        {offline ? (
          <NetworkStateCard
            title="You're offline"
            body="Reconnect to update your profile."
          />
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 6 }}>
            <Text variant="label" color={colors.inkMuted}>
              Name
            </Text>
            <Input placeholder="Your name" value={name} onChangeText={setName} />
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="label" color={colors.inkMuted}>
              Email (optional)
            </Text>
            <Input
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {error ? (
            <Text variant="caption" color={colors.danger}>
              {error}
            </Text>
          ) : null}

          <PrimaryButton title={saving ? "Saving..." : "Save changes"} onPress={onSave} disabled={!canSave || saving} />
        </Card>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

