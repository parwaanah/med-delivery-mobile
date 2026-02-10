import React from "react";
import { View, ImageBackground, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "@mobile/ui";

const splashBg = require("../assets/splash/splash-pattern.png");

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ImageBackground source={splashBg} style={styles.bg} imageStyle={styles.bgImage}>
        <LinearGradient
          colors={["#0f9aa6", colors.primary, "#0b6f64"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.bg}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom + spacing.lg,
              paddingHorizontal: spacing.xl,
            }}
          >
            {children}
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  bg: { flex: 1 },
  bgImage: { opacity: 0.42, resizeMode: "cover" },
});

