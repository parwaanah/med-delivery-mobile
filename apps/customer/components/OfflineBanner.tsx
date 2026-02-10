import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Text, colors, spacing } from "@mobile/ui";
import { Ionicons } from "@expo/vector-icons";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  if (!offline) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.inkStrong,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
          <View style={{ gap: 2 }}>
            <Text variant="label" color="#fff">
              You{"'"}re offline
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.85)">
              Some features may not work.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => NetInfo.fetch()}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
        >
          <Text variant="label" color="#fff">
            Retry
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
