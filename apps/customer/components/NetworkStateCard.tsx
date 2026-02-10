import { View } from "react-native";
import { Text, Card, PrimaryButton, colors, spacing } from "@mobile/ui";
import { Ionicons } from "@expo/vector-icons";

export function NetworkStateCard({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <Card style={{ gap: spacing.sm, padding: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="cloud-offline-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subtitle">{title}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {body}
          </Text>
        </View>
      </View>
      {onRetry ? <PrimaryButton title="Retry" onPress={onRetry} variant="secondary" /> : null}
    </Card>
  );
}

