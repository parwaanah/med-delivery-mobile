import React from "react";
import { View, ScrollView, ViewStyle, StyleProp } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, layout } from "./theme";

type ScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

type ScreenScrollProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  bottomOffset?: number;
};

export function Screen({ children, style, padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.surface,
          paddingTop: insets.top + (padded ? spacing.xl : 0),
          paddingBottom: insets.bottom + (padded ? spacing.lg : 0),
        },
        padded && { paddingHorizontal: spacing.xl },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ScreenScroll({
  children,
  contentStyle,
  style,
  padded = true,
  bottomOffset = 140,
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: colors.surface }, style]}
      contentContainerStyle={[
        {
          paddingTop: insets.top + (padded ? spacing.xl : 0),
          paddingBottom:
            Math.max(insets.bottom, spacing.xl) +
            bottomOffset +
            layout.tabBarHeight,
        },
        padded && { paddingHorizontal: spacing.xl },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
