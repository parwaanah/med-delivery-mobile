import { Image, ImageBackground, StyleSheet, Text, View } from "react-native";
import { branding } from "../constants/branding";

const splashBg = require("../assets/splash/splash-pattern.png");

export function AppSplash(
  { useBrandFont = true }: { useBrandFont?: boolean } = {}
) {
  const logoSource = branding.logoFestive ?? branding.logoDefault;

  return (
    <ImageBackground source={splashBg} style={styles.container}>
      <View style={styles.overlay}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text
          style={[
            styles.title,
            useBrandFont ? styles.brandFont : styles.systemFont,
          ]}
        >
          {branding.name}
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f9aa6",
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    color: "#e9fbff",
    fontSize: 22,
    letterSpacing: 0.5,
  },
  brandFont: {
    fontFamily: "ProximaNova_600SemiBold",
  },
  systemFont: {
    fontWeight: "600",
  },
});
