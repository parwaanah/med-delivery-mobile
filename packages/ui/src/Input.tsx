import React from "react";
import { TextInput, View, StyleSheet, TextInputProps } from "react-native";
import { Text } from "./Text";
import { colors, radii, spacing, typography } from "./theme";

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
};

export const Input: React.FC<Props> = ({ label, helper, error, style, ...rest }) => {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor="#9AA3AE"
      />
      {error ? (
        <Text variant="caption" style={styles.error}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" style={styles.helper}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: colors.inkMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    color: colors.ink,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: colors.danger,
  },
  helper: {
    color: colors.inkMuted,
  },
  error: {
    color: colors.danger,
  },
});
