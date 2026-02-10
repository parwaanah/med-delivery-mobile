import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text, Card, PrimaryButton, colors, spacing } from "@mobile/ui";

export function MedicalDisclaimerModal({
  visible,
  onAccept,
  onClose,
}: {
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        }}
      >
        <View style={{ padding: spacing.xl }}>
          <Card style={{ padding: spacing.lg, gap: spacing.md }}>
            <Text variant="subtitle">Medical disclaimer</Text>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              <Text variant="body" color={colors.inkMuted}>
                We provide a delivery service for medicines and health products. We do not provide
                medical advice. Always follow your doctor{"'"}s instructions and the medicine label.
                {"\n\n"}
                If a prescription is required, your order may be held until a valid prescription is
                provided and verified.
              </Text>
            </ScrollView>

            <PrimaryButton title="I understand" onPress={onAccept} />
            <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 6 }}>
              <Text variant="label" color={colors.inkMuted}>
                Cancel
              </Text>
            </Pressable>
          </Card>
        </View>
      </View>
    </Modal>
  );
}
