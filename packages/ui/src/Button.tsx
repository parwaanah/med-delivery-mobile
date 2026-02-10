import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { colors, radii, typography } from "./theme";
import { HeartRateLoader } from "./Loader";

type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  full?: boolean;
};

export const Button: React.FC<Props> = ({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  full,
}) => {
  const isDisabled = disabled || loading;
  const palette =
    variant === "primary"
      ? { bg: colors.primary, fg: "#fff", bgPressed: "#137C5C" }
      : variant === "secondary"
        ? { bg: colors.secondary, fg: colors.inkStrong, bgPressed: "#E39B2A" }
        : { bg: "transparent", fg: colors.primary, bgPressed: colors.primarySoft };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? palette.bgPressed : palette.bg },
        full && { width: "100%" },
        isDisabled && { opacity: 0.5 },
        variant === "ghost" && styles.ghost,
      ]}
    >
      {loading ? (
        <View style={styles.loaderWrap}>
          <HeartRateLoader width={56} height={18} color={palette.fg} strokeWidth={3} />
        </View>
      ) : (
        <Text style={[styles.label, { color: palette.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  label: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontFamily: typography.family.semibold,
  },
  loaderWrap: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
