import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleProp, StyleSheet, ViewStyle } from "react-native";

type Props = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export const Skeleton: React.FC<Props> = ({ width = "100%", height = 14, radius = 10, style }) => {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.95, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const baseStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius: radius,
    }),
    [width, height, radius]
  );

  // Animated.View style typing is stricter than RN ViewStyle (percent strings, etc.). Keep runtime flexible.
  return <Animated.View style={[styles.base, baseStyle as any, { opacity }, style] as any} />;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#E8ECEB",
  },
});
