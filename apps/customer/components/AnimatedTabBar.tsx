import React from "react";
import { StyleSheet } from "react-native";
import { BottomTabBar, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useTabBarVisibility } from "./TabBarVisibility";

export function AnimatedTabBar(props: BottomTabBarProps) {
  const { translateY } = useTabBarVisibility();

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, style]}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});

