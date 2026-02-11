import { useMemo, useRef } from "react";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useTabBarVisibility } from "../components/TabBarVisibility";

export function useHideTabBarOnScroll(opts?: { thresholdPx?: number }) {
  const { show, hide } = useTabBarVisibility();
  const lastY = useRef(0);
  const acc = useRef(0);
  const threshold = Math.max(8, opts?.thresholdPx ?? 18);

  return useMemo(() => {
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;

      // Ignore tiny jitter.
      if (Math.abs(dy) < 2) return;

      acc.current += dy;

      if (acc.current > threshold) {
        hide();
        acc.current = 0;
      } else if (acc.current < -threshold) {
        show();
        acc.current = 0;
      }
    };

    return { onScroll } as const;
  }, [hide, show, threshold]);
}

