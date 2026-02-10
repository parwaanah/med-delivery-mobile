import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "./theme";

type Props = {
  size?: number;
  color?: string;
};

export const NewtonsCradleLoader: React.FC<Props> = ({ size = 44, color = "#474554" }) => {
  const left = useRef(new Animated.Value(0)).current;
  const right = useRef(new Animated.Value(0)).current;

  const duration = 1200;

  useEffect(() => {
    const leftAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(left, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(left, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const rightAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(right, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(right, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    leftAnim.start();
    rightAnim.start();

    return () => {
      leftAnim.stop();
      rightAnim.stop();
    };
  }, [left, right]);

  const dotSize = size * 0.25;
  const containerStyle = useMemo(
    () => ({
      width: size,
      height: size,
    }),
    [size]
  );

  const leftRotate = left.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "70deg"],
  });

  const rightRotate = right.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-70deg"],
  });

  return (
    <View style={[styles.root, containerStyle]}>
      <Animated.View style={[styles.dotWrap, { transform: [{ rotate: leftRotate }] }]}>
        <View style={[styles.dot, { width: dotSize, height: dotSize, backgroundColor: color }]} />
      </Animated.View>
      <View style={styles.dotWrap}>
        <View style={[styles.dot, { width: dotSize, height: dotSize, backgroundColor: color }]} />
      </View>
      <View style={styles.dotWrap}>
        <View style={[styles.dot, { width: dotSize, height: dotSize, backgroundColor: color }]} />
      </View>
      <Animated.View style={[styles.dotWrap, { transform: [{ rotate: rightRotate }] }]}>
        <View style={[styles.dot, { width: dotSize, height: dotSize, backgroundColor: color }]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dotWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    transformOrigin: "top",
  },
  dot: {
    borderRadius: 999,
  },
});

type HeartRateProps = {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ECG / heart-rate line loader (teal by default).
export const HeartRateLoader: React.FC<HeartRateProps> = ({
  width = 220,
  height = 64,
  color = colors.primary,
  strokeWidth = 4,
}) => {
  const dasharray = 814;
  const dash = useRef(new Animated.Value(dasharray)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(dash, {
        toValue: -dasharray,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: false, // animating SVG props
      })
    );
    anim.start();
    return () => anim.stop();
  }, [dash]);

  // Path is scaled to the viewBox; keep it wide so it feels like a "scan".
  const d =
    "M0 60 H60 L78 60 L90 20 L105 92 L120 60 L160 60 L175 40 L190 80 L205 60 H520";

  return (
    <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
      <Svg width={width} height={height} viewBox="0 0 520 120">
        <AnimatedPath
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dasharray}
          strokeDashoffset={dash}
        />
      </Svg>
    </View>
  );
};
