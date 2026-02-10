import { Modal, View, Pressable } from "react-native";
import { Text, Card, PrimaryButton, colors, spacing } from "@mobile/ui";
import * as Linking from "expo-linking";

export function LegalConsentModal(props: {
  visible: boolean;
  version?: string;
  termsUrl?: string;
  privacyUrl?: string;
  onClose: () => void;
  onAccept: () => Promise<void> | void;
}) {
  const { visible, onClose, onAccept, version, termsUrl, privacyUrl } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: spacing.xl,
          justifyContent: "center",
        }}
      >
        <Card style={{ gap: spacing.md }}>
          <Text variant="subtitle">Terms & Privacy</Text>
          <Text variant="body" color={colors.inkMuted}>
            Please review and accept to continue. {version ? `Version: ${version}` : ""}
          </Text>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Pressable
              onPress={() => {
                if (termsUrl) Linking.openURL(termsUrl);
              }}
              style={{ flex: 1 }}
            >
              <Text variant="label" color={termsUrl ? colors.primary : colors.inkMuted}>
                View terms
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (privacyUrl) Linking.openURL(privacyUrl);
              }}
              style={{ flex: 1, alignItems: "flex-end" }}
            >
              <Text variant="label" color={privacyUrl ? colors.primary : colors.inkMuted}>
                View privacy
              </Text>
            </Pressable>
          </View>

          <PrimaryButton title="I accept" onPress={() => onAccept()} />
          <PrimaryButton title="Not now" variant="secondary" onPress={onClose} />
        </Card>
      </View>
    </Modal>
  );
}

