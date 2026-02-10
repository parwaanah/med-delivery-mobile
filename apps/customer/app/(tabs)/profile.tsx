import { View, Pressable } from "react-native";
import { Text, Card, PrimaryButton, colors, spacing, radii, Screen, layout } from "@mobile/ui";
import { useAuthStore } from "@mobile/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Screen
        padded={false}
        style={{
          paddingHorizontal: spacing.xl,
          paddingBottom: Math.max(spacing.lg, insets.bottom) + layout.tabBarHeight,
        }}
      >
        <View
          style={{
            padding: spacing.xl,
            paddingTop: spacing.xxl,
            backgroundColor: colors.inkStrong,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            gap: spacing.md,
          }}
        >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subtitle" color="#fff">
              {user?.name || "Guest"}
            </Text>
            <Text variant="caption" color="#E2E8F0">
              {user?.email || "user@email.com"}
            </Text>
            <Text variant="caption" color="#C7CED6">
              Registered since Dec 202X
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (!user) {
                router.push("/(auth)/phone");
                return;
              }
              router.push("/profile/edit" as any);
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
          </Pressable>
        </View>
        </View>

        <View style={{ paddingTop: spacing.xl, gap: spacing.md }}>
        <Card style={{ gap: spacing.md }}>
          {[
            { label: "My Orders", icon: "receipt-outline", href: "/(tabs)/orders" },
            { label: "My Wishlist", icon: "heart-outline" },
            { label: "My Prescription", icon: "document-text-outline", href: "/prescriptions" },
            { label: "Your Lab Test", icon: "flask-outline", href: "/(tabs)/lab" },
            { label: "Doctor Consultation", icon: "chatbubbles-outline" },
            { label: "Payment Methods", icon: "card-outline" },
            { label: "Your Addresses", icon: "location-outline", href: "/addresses" },
            { label: "Notifications", icon: "notifications-outline", href: "/notifications" },
            { label: "Notification Preferences", icon: "options-outline", href: "/profile/notification-preferences" },
            { label: "Terms & Privacy", icon: "document-outline", href: "/legal" },
            { label: "Pill Reminder", icon: "alarm-outline" },
            { label: "Invite Friends", icon: "gift-outline" },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                if (item.href) router.push(item.href as any);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
              <Text variant="body" style={{ flex: 1 }}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
            </Pressable>
          ))}
        </Card>

        <View
          style={{
            backgroundColor: "#E9F7F1",
            padding: spacing.lg,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: "#D6F0E6",
          }}
        >
          <Text variant="subtitle">Need Help?</Text>
        </View>

          <PrimaryButton
            title="Sign out"
            onPress={async () => {
              await logout();
              router.replace("/(auth)/phone");
            }}
            variant="secondary"
          />
        </View>
      </Screen>
    </View>
  );
}

