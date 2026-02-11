import { Card, PrimaryButton, ScreenScroll, Text, colors, spacing } from "@mobile/ui";

export default function DoctorScreen() {
  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Doctor Consultation</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Talk to a doctor</Text>
        <Text variant="body" color={colors.inkMuted}>
          Coming soon. We’ll enable doctor consultation once the backend is ready.
        </Text>
        <PrimaryButton title="Notify me" variant="secondary" />
      </Card>
    </ScreenScroll>
  );
}

