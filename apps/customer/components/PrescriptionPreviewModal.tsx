import { Modal, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Text, PrimaryButton, colors, spacing } from "@mobile/ui";
import * as Linking from "expo-linking";

export function PrescriptionPreviewModal({
  visible,
  uri,
  mime,
  title = "Preview",
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  mime: string | null;
  title?: string;
  onClose: () => void;
}) {
  if (!visible) return null;

  const isImage = Boolean(mime?.startsWith("image/")) || (uri ? /\.(png|jpe?g|webp)$/i.test(uri) : false);
  const isPdf = Boolean(mime === "application/pdf") || (uri ? /\.pdf$/i.test(uri) : false);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
          padding: spacing.xl,
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text variant="subtitle">{title}</Text>
            {uri ? (
              isImage ? (
                <Image
                  source={{ uri }}
                  style={{ width: "100%", height: 360, borderRadius: 14, backgroundColor: colors.surface }}
                  contentFit="contain"
                />
              ) : (
                <View
                  style={{
                    height: 220,
                    borderRadius: 14,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing.md,
                    gap: 6,
                  }}
                >
                  <Text variant="label">{isPdf ? "PDF" : "File"} selected</Text>
                  <Text variant="caption" color={colors.inkMuted} numberOfLines={2}>
                    {uri}
                  </Text>
                </View>
              )
            ) : (
              <Text variant="body" color={colors.inkMuted}>
                No file selected.
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <PrimaryButton title="Close" variant="secondary" onPress={onClose} />
              {uri ? (
                <PrimaryButton
                  title="Open"
                  onPress={() => {
                    Linking.openURL(uri).catch(() => {});
                  }}
                />
              ) : null}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

