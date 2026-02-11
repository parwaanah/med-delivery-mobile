import { Card, PrimaryButton, ScreenScroll, Text, colors, spacing } from "@mobile/ui";

export default function RemindersScreen() {
  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Pill Reminder</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Refill reminders</Text>
        <Text variant="body" color={colors.inkMuted}>
          Coming soon. We’ll add reminders and refills once the backend is ready.
        </Text>
        <PrimaryButton title="Notify me" variant="secondary" />
      </Card>
    </ScreenScroll>
  );
}

