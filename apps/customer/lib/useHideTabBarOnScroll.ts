import { useMemo, useRef } from "react";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useTabBarVisibility } from "../components/TabBarVisibility";

export function useHideTabBarOnScroll(opts?: { hideThresholdPx?: number; showThresholdPx?: number }) {
  const { show, hide } = useTabBarVisibility();
  const lastY = useRef(0);
  const accDown = useRef(0);
  const accUp = useRef(0);
  const hideThreshold = Math.max(12, opts?.hideThresholdPx ?? 22);
  const showThreshold = Math.max(4, opts?.showThresholdPx ?? 8);

  return useMemo(() => {
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;

      // Ignore tiny jitter.
      if (Math.abs(dy) < 2) return;

      if (dy > 0) {
        accDown.current += dy;
        accUp.current = 0;
        if (accDown.current > hideThreshold) {
          hide();
          accDown.current = 0;
        }
      } else {
        accUp.current += -dy;
        accDown.current = 0;
        if (accUp.current > showThreshold) {
          show();
          accUp.current = 0;
        }
      }
    };

    return { onScroll } as const;
  }, [hide, show, hideThreshold, showThreshold]);
}
