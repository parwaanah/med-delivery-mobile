import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuthStore } from "@mobile/auth";
import { HeartRateLoader, colors } from "@mobile/ui";
import { useEffect, useState } from "react";
import { isOnboardingDone } from "../lib/onboarding";

export default function Index() {
  const { loading, user } = useAuthStore();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isOnboardingDone()
      .then((v) => {
        if (active) setOnboarded(v);
      })
      .catch(() => {
        if (active) setOnboarded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || onboarded === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <HeartRateLoader width={240} height={72} color={colors.primary} strokeWidth={5} />
      </View>
    );
  }

  if (!onboarded) return <Redirect href={"/(onboarding)" as any} />;
  return <Redirect href={user ? "/(tabs)" : "/(auth)/phone"} />;
}
