import { Text, Card, PrimaryButton, colors, spacing, ScreenScroll } from "@mobile/ui";

export default function LabScreen() {
  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Lab Tests</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Book lab tests</Text>
        <Text variant="body" color={colors.inkMuted}>
          Coming soon. We will enable diagnostic booking once the backend is ready.
        </Text>
        <PrimaryButton title="Notify me" variant="secondary" />
      </Card>
    </ScreenScroll>
  );
}
