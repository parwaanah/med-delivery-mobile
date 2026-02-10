import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Api, queryClient } from "@mobile/api";
import { ThemeProvider, ToastProvider, colors } from "@mobile/ui";
import { useAuthStore } from "@mobile/auth";
import { View, AppState } from "react-native";
import { useFonts } from "expo-font";
import { AppSplash } from "../components/AppSplash";
import * as SplashScreen from "expo-splash-screen";
import { OfflineBanner } from "../components/OfflineBanner";
import { NotificationPoller } from "../components/NotificationPoller";
import { NotificationDeepLinkHandler } from "../components/NotificationDeepLinkHandler";
import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { isExpoGoClient } from "../lib/expoGo";
import { initSentry } from "../sentry";
import { Text, Pressable } from "react-native";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { bootstrap, loading, bootstrapError } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [fontsLoaded] = useFonts({
    ProximaNova_400Regular: require("../assets/fonts/ProximaNova-Regular.otf"),
    ProximaNova_500Medium: require("../assets/fonts/ProximaNova-Medium.otf"),
    ProximaNova_600SemiBold: require("../assets/fonts/ProximaNova-Semibold.otf"),
    ProximaNova_700Bold: require("../assets/fonts/ProximaNova-Bold.otf"),
  });

  useEffect(() => {
    initSentry();
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
    });
    const unsubNet = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      if (!down) queryClient.invalidateQueries({ queryKey: ["cart"] });
    });
    return () => {
      sub.remove();
      unsubNet();
    };
  }, []);

  // Register native push token (FCM/APNs) if available.
  // Note: Expo Go does not support remote push notifications in SDK 53+.
  useEffect(() => {
    if (isExpoGoClient()) return;
    if (!accessToken || !user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        const perm = await Notifications.getPermissionsAsync();
        const granted = (perm as any).granted ?? (perm.status === "granted");
        if (!granted) return;

        // Native device token: FCM on Android, APNs on iOS.
        const device = await Notifications.getDevicePushTokenAsync();
        const token = String((device as any)?.data || "").trim();
        if (!token) return;

        const cacheKey = `push_token_registered_${user.id}`;
        const last = await SecureStore.getItemAsync(cacheKey);
        if (last === token) return;

        const platform = (device as any)?.type ? String((device as any).type).toUpperCase() : (Constants.platform?.ios ? "IOS" : "ANDROID");
        await Api.request("/notifications/device-token", {
          method: "POST",
          token: accessToken,
          body: { token, platform },
        });

        if (!cancelled) await SecureStore.setItemAsync(cacheKey, token);
      } catch {
        // best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id]);

  if (!fontsLoaded) {
    return <AppSplash useBrandFont={false} />;
  }

  SplashScreen.hideAsync().catch(() => {});

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <OfflineBanner />
              <NotificationPoller token={accessToken} userId={user?.id ?? null} />
              <NotificationDeepLinkHandler />
              <Slot />
              {loading && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                  }}
                >
                  <AppSplash useBrandFont />
                </View>
              )}
              {!loading && bootstrapError && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0,0,0,0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      maxWidth: 420,
                      backgroundColor: colors.surface,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>
                      Poor connection
                    </Text>
                    <Text style={{ marginTop: 6, fontSize: 13, color: colors.inkMuted }}>
                      {bootstrapError}. Check your network or API base URL, then retry.
                    </Text>
                    <Pressable
                      onPress={() => bootstrap()}
                      style={{
                        marginTop: 12,
                        backgroundColor: colors.primary,
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "700" }}>Retry</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
