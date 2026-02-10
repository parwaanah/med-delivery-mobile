import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { colors, radii, spacing } from "./theme";

type Props = ViewProps & {
  elevated?: boolean;
};

export const Card: React.FC<Props> = ({ elevated = true, style, children, ...rest }) => {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        elevated && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card ?? colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});
