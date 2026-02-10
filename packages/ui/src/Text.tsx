import React from "react";
import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { typography, colors } from "./theme";

type Role = "title" | "subtitle" | "body" | "caption" | "label" | "titleLarge";

type Props = TextProps & {
  role?: Role;
  variant?: Role;
  color?: string;
  weight?: string;
};

export const Text: React.FC<Props> = ({
  role = "body",
  variant,
  color = colors.ink,
  weight,
  style,
  children,
  ...rest
}) => {
  const key = variant || role;
  const token =
    key === "titleLarge"
      ? {
          size: typography.title.size + 6,
          lineHeight: typography.title.lineHeight + 6,
          weight: "700",
        }
      : typography[key as Exclude<Role, "titleLarge">];

  const resolvedWeight = weight || (token as any).weight;
  const fontFamily =
    resolvedWeight === "700"
      ? typography.family.bold
      : resolvedWeight === "600"
        ? typography.family.semibold
        : resolvedWeight === "500"
          ? typography.family.medium
          : typography.family.regular;

  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        {
          fontSize: token.size,
          lineHeight: token.lineHeight,
          fontFamily,
          letterSpacing: resolvedWeight === "700" ? 0.2 : 0,
          color,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.family.regular,
    includeFontPadding: false,
  },
});
