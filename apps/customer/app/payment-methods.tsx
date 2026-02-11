import { Card, ScreenScroll, Text, colors, spacing } from "@mobile/ui";

export default function PaymentMethodsScreen() {
  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Payment Methods</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Manage your payments</Text>
        <Text variant="body" color={colors.inkMuted}>
          Coming soon. Payments are currently managed per order when payment is requested.
        </Text>
      </Card>
    </ScreenScroll>
  );
}

