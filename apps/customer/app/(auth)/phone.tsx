import { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useAuthStore } from "@mobile/auth";
import { PrimaryButton, Text as UiText, Card, Input, colors, spacing } from "@mobile/ui";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingShell } from "../../components/OnboardingShell";

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(0,0,0,${alpha})`;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function PhoneScreen() {
  const router = useRouter();
  const sendLoginOtp = useAuthStore((s) => s.sendLoginOtp);
  const otpPreview = useAuthStore((s) => s.otpPreview);
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const disabled = phone.trim().length < 8 || loading;

  const onSubmit = async () => {
    if (disabled) return;
    try {
      setLoading(true);
      await sendLoginOtp(phone.trim());
      router.push({ pathname: "/(auth)/otp", params: { phone: phone.trim() } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <UiText variant="titleLarge" style={{ color: "#fff" }}>
                  Welcome back
                </UiText>
                <UiText variant="body" style={{ color: "rgba(255,255,255,0.85)" }}>
                  Sign in with your phone number to continue.
                </UiText>
              </View>
            </View>
          </View>

          <Card
            style={{
              padding: spacing.lg,
              gap: spacing.md,
              backgroundColor: "rgba(255,255,255,0.96)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
            }}
          >
            <UiText variant="label">Mobile number</UiText>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => {
                  if (countryCode === "+91") setCountryCode("+1");
                  else if (countryCode === "+1") setCountryCode("+44");
                  else setCountryCode("+91");
                }}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 76,
                }}
              >
                <UiText variant="body">{countryCode}</UiText>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Input
                  keyboardType="phone-pad"
                  placeholder="Your phone number"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>
            <PrimaryButton title="Send OTP" onPress={onSubmit} loading={loading} disabled={disabled} />
            {otpPreview ? (
              <View
                style={{
                  padding: spacing.sm,
                  borderRadius: 12,
                  backgroundColor: hexToRgba(colors.primary, 0.12),
                }}
              >
                <UiText variant="caption" style={{ color: colors.inkMuted }}>
                  Dev OTP: <UiText variant="label">{otpPreview}</UiText>
                </UiText>
              </View>
            ) : null}
            <UiText variant="caption" style={{ color: colors.inkMuted }}>
              By continuing, you agree to our Terms and Privacy Policy.
            </UiText>
          </Card>

          <View style={{ flex: 1 }} />

          <View style={{ paddingTop: spacing.lg }}>
            <UiText variant="caption" style={{ color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
              We’ll send a one‑time code to verify your number.
            </UiText>
          </View>
        </KeyboardAvoidingView>
      </OnboardingShell>
    </>
  );
}


