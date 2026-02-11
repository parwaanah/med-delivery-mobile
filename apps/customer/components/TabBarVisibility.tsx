import React, { createContext, useCallback, useContext, useMemo } from "react";
import { Easing, SharedValue, useSharedValue, withTiming } from "react-native-reanimated";

type TabBarVisibilityApi = {
  translateY: SharedValue<number>;
  show: () => void;
  hide: () => void;
  setHidden: (hidden: boolean) => void;
};

const Ctx = createContext<TabBarVisibilityApi | null>(null);

export function TabBarVisibilityProvider({ children, hiddenOffset }: { children: React.ReactNode; hiddenOffset: number }) {
  const translateY = useSharedValue(0);

  const show = useCallback(() => {
    translateY.value = withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) });
  }, [translateY]);

  const hide = useCallback(() => {
    translateY.value = withTiming(hiddenOffset, { duration: 340, easing: Easing.out(Easing.cubic) });
  }, [translateY, hiddenOffset]);

  const setHidden = useCallback(
    (hidden: boolean) => {
      if (hidden) hide();
      else show();
    },
    [hide, show]
  );

  const value = useMemo(() => ({ translateY, show, hide, setHidden }), [translateY, show, hide, setHidden]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTabBarVisibility() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTabBarVisibility must be used within TabBarVisibilityProvider");
  return v;
}
