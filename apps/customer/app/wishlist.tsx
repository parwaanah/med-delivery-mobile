import { Card, ScreenScroll, Text, colors, spacing } from "@mobile/ui";

export default function WishlistScreen() {
  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Wishlist</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Saved items</Text>
        <Text variant="body" color={colors.inkMuted}>
          Coming soon. We’ll add wishlist once the backend supports it.
        </Text>
      </Card>
    </ScreenScroll>
  );
}

