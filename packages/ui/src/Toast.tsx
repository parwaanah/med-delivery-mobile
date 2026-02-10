import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text as RNText } from "react-native";
import { colors, radii, spacing, typography } from "./theme";

type Toast = {
  id: number;
  message: string;
};

type ToastContextValue = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string) => {
      const next = { id: Date.now(), message };
      setToast(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 12, duration: 160, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }, 1600);
    },
    [opacity, translateY]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
          <RNText style={styles.toastText}>{toast.message}</RNText>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { show: () => {} };
  }
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 28,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  toastText: {
    color: "#fff",
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontFamily: typography.family.medium,
  },
});
