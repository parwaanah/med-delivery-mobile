import { useEffect, useRef, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useAuthStore } from "@mobile/auth";
import { PrimaryButton, Text as UiText, Card, colors, spacing } from "@mobile/ui";
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

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);
  const sendLoginOtp = useAuthStore((s) => s.sendLoginOtp);
  const otpPreview = useAuthStore((s) => s.otpPreview);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disabled = otp.trim().length < 4 || loading;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onSubmit = async () => {
    if (disabled) return;
    try {
      setLoading(true);
      await loginWithOtp({ phone: String(phone), otp: otp.trim() });
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resendIn > 0) return;
    await sendLoginOtp(String(phone));
    setResendIn(30);
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
                <Ionicons name="key" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <UiText variant="titleLarge" style={{ color: "#fff" }}>
                  Verify OTP
                </UiText>
                <UiText variant="body" style={{ color: "rgba(255,255,255,0.85)" }}>
                  Code sent to {phone}
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
            <UiText variant="label">One-time passcode</UiText>
            <TextInput
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: spacing.md,
                fontSize: 22,
                letterSpacing: 10,
                textAlign: "center",
                backgroundColor: colors.surface,
              }}
              textContentType="oneTimeCode"
            />
            <PrimaryButton title="Verify" onPress={onSubmit} loading={loading} disabled={disabled} />
            <PrimaryButton
              variant="secondary"
              title={resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
              onPress={onResend}
              disabled={resendIn > 0}
            />
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
          </Card>
        </KeyboardAvoidingView>
      </OnboardingShell>
    </>
  );
}


