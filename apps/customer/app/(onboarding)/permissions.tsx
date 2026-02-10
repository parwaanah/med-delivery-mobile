import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { isExpoGoClient } from "../../lib/expoGo";
import { Text, Card, PrimaryButton, colors, spacing, HeartRateLoader } from "@mobile/ui";
import { Ionicons } from "@expo/vector-icons";
import { setOnboardingDone } from "../../lib/onboarding";
import { OnboardingShell } from "../../components/OnboardingShell";

type PermState = "unknown" | "granted" | "denied" | "requires_build";

export default function PermissionsScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loc, setLoc] = useState<PermState>("unknown");
  const [notif, setNotif] = useState<PermState>("unknown");
  const [busy, setBusy] = useState(false);

  const allDone = useMemo(() => loc !== "unknown" && notif !== "unknown", [loc, notif]);
  const isExpoGo = isExpoGoClient();

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const l = await Location.getForegroundPermissionsAsync();
      setLoc(l.granted ? "granted" : l.canAskAgain ? "unknown" : "denied");

      // expo-notifications remote push isn't supported in Expo Go (SDK 53+).
      if (isExpoGo) {
        setNotif("requires_build");
      } else {
        const Notifications = await import("expo-notifications");
        const n = await Notifications.getPermissionsAsync();
        const granted = (n as any).granted ?? (n.status === "granted");
        setNotif(granted ? "granted" : (n as any).canAskAgain ? "unknown" : "denied");
      }
    } finally {
      setChecking(false);
    }
  }, [isExpoGo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestLocation = async () => {
    setBusy(true);
    try {
      const r = await Location.requestForegroundPermissionsAsync();
      setLoc(r.granted ? "granted" : r.canAskAgain ? "unknown" : "denied");
    } finally {
      setBusy(false);
    }
  };

  const requestNotifications = async () => {
    if (isExpoGo) {
      setNotif("requires_build");
      return;
    }
    setBusy(true);
    try {
      const Notifications = await import("expo-notifications");
      const r = await Notifications.requestPermissionsAsync();
      const granted = (r as any).granted ?? (r.status === "granted");
      setNotif(granted ? "granted" : (r as any).canAskAgain ? "unknown" : "denied");
    } finally {
      setBusy(false);
    }
  };

  const onContinue = async () => {
    await setOnboardingDone();
    router.replace("/(auth)/phone");
  };

  return (
    <OnboardingShell>
      <View style={{ gap: spacing.lg, flex: 1 }}>
        <View style={{ gap: 8 }}>
          <Text variant="titleLarge" style={{ color: "#fff" }}>
            Quick setup
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.85)">
            Optional permissions that help us deliver faster and keep you updated.
          </Text>
        </View>

        {checking ? (
          <Card
            style={{
              alignItems: "center",
              paddingVertical: spacing.lg,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
            }}
          >
            <HeartRateLoader width={220} height={56} color="#fff" />
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            <PermissionRow
              title="Location"
              subtitle="Use your location for faster address selection."
              state={loc}
              icon="location-outline"
              onPress={requestLocation}
              disabled={busy}
            />

            <PermissionRow
              title="Notifications"
              subtitle={
                isExpoGo
                  ? "Requires a dev build (Expo Go limitation)."
                  : "Order status updates and reminders."
              }
              state={notif}
              icon="notifications-outline"
              onPress={requestNotifications}
              disabled={busy || isExpoGo}
            />
          </View>
        )}

        <View style={{ flex: 1 }} />

        <Card
          style={{
            gap: 8,
            backgroundColor: "rgba(255,255,255,0.10)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text variant="label" style={{ color: "rgba(255,255,255,0.95)" }}>
            Tip
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.85)">
            You can always change permissions later in system settings.
            {Platform.OS === "android" ? " (Settings > Apps > Permissions)" : ""}
          </Text>
        </Card>

        <PrimaryButton title="Continue" onPress={onContinue} disabled={!checking && !allDone} />

        <Pressable onPress={onContinue} style={{ alignItems: "center" }}>
          <Text variant="label" color="rgba(255,255,255,0.85)">
            Continue without permissions
          </Text>
        </Pressable>
      </View>
    </OnboardingShell>
  );
}

function PermissionRow({
  title,
  subtitle,
  state,
  icon,
  onPress,
  disabled,
}: {
  title: string;
  subtitle: string;
  state: PermState;
  icon: any;
  onPress: () => void;
  disabled?: boolean;
}) {
  const badge =
    state === "granted"
      ? "Enabled"
      : state === "denied"
        ? "Denied"
        : state === "requires_build"
          ? "Dev build"
          : "Optional";
  const badgeBg =
    state === "granted"
      ? "rgba(22,142,106,0.12)"
      : state === "denied"
        ? "rgba(229,57,53,0.12)"
        : state === "requires_build"
          ? "rgba(41,45,50,0.12)"
        : colors.surface;
  const badgeColor =
    state === "granted"
      ? colors.primary
      : state === "denied"
        ? colors.danger
        : colors.inkMuted;

  return (
    <Card style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="subtitle">{title}</Text>
            <Text variant="caption" color={colors.inkMuted}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: badgeBg }}>
          <Text variant="label" color={badgeColor}>
            {badge}
          </Text>
        </View>
      </View>

      <PrimaryButton
        title={
          state === "granted"
            ? "Enabled"
            : state === "requires_build"
              ? "Use a dev build"
              : title === "Location"
                ? "Enable location"
                : "Enable notifications"
        }
        onPress={onPress}
        disabled={disabled || state === "granted" || state === "requires_build"}
        variant={state === "granted" || state === "requires_build" ? "secondary" : "primary"}
      />
    </Card>
  );
}
