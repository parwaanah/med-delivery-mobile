import { Tabs } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, layout } from "@mobile/ui";
import { useQuery } from "@tanstack/react-query";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

function TabIcon({ name, color }: { name: any; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

const TABS_CACHE_KEY = "app_config_mobile_tabs_v2";

const TAB_CATALOG = [
  { key: "index", title: "Home", icon: "home-outline", iconActive: "home" },
  { key: "cart", title: "Cart", icon: "cart-outline", iconActive: "cart" },
  { key: "orders", title: "Orders", icon: "file-tray-outline", iconActive: "file-tray" },
  { key: "lab", title: "Lab Test", icon: "flask-outline", iconActive: "flask" },
  { key: "offers", title: "Offers", icon: "pricetag-outline", iconActive: "pricetag" },
  { key: "profile", title: "Profile", icon: "person-outline", iconActive: "person" },
] as const;

type TabKey = (typeof TAB_CATALOG)[number]["key"];

export default function TabLayout() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [tabsConfigCached, setTabsConfigCached] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(TABS_CACHE_KEY)
      .then((raw) => {
        if (!active) return;
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setTabsConfigCached(parsed.map((t: any) => String(t)));
        } catch {}
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const tabsConfigQuery = useQuery({
    queryKey: ["app-config", "mobile-tabs"],
    queryFn: async () => {
      const res = await Api.request<any>("/config/mobile-tabs");
      const tabs = Array.isArray(res?.tabs) ? (res.tabs.map((t: unknown) => String(t)) as string[]) : null;
      if (tabs && tabs.length) {
        SecureStore.setItemAsync(TABS_CACHE_KEY, JSON.stringify(tabs)).catch(() => {});
        setTabsConfigCached(tabs);
      }
      return tabs;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tabsConfigQuery.refetch().catch(() => {});
    });
    return () => sub.remove();
  }, [tabsConfigQuery]);

  const visibleTabs = useMemo(() => {
    const tabsConfig = tabsConfigQuery.data ?? tabsConfigCached ?? null;
    if (!tabsConfig) return TAB_CATALOG;
    const allowed = new Set<TabKey>(TAB_CATALOG.map((t) => t.key));
    const ordered = tabsConfig.map((t) => String(t)) as string[];
    const filtered = ordered.filter((t) => allowed.has(t as TabKey)) as TabKey[];
    if (filtered.length === 0) return TAB_CATALOG;
    return filtered.map((key) => TAB_CATALOG.find((t) => t.key === key)!).filter(Boolean);
  }, [tabsConfigQuery.data, tabsConfigCached]);

  const cartQuery = useQuery({
    queryKey: ["cart", token],
    enabled: Boolean(token) && String(user?.role || "").toUpperCase() === "CUSTOMER",
    queryFn: () => Api.request<any>("/cart", { token: token || undefined }),
    staleTime: 15_000,
    refetchInterval: 25_000,
  });

  const cartCount = useMemo(() => {
    const items = cartQuery.data?.items;
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum: number, it: any) => sum + Number(it?.quantity || 0), 0);
  }, [cartQuery.data]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "badge", token],
    enabled: Boolean(token) && String(user?.role || "").toUpperCase() === "CUSTOMER",
    queryFn: () => Api.request<any[]>("/notifications", { token: token || undefined }),
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const unreadPaymentRequestedCount = useMemo(() => {
    const list = Array.isArray(notificationsQuery.data) ? notificationsQuery.data : [];
    return list.filter((n: any) => String(n?.status || "").toUpperCase() !== "READ" && String(n?.type || "") === "payment.requested").length;
  }, [notificationsQuery.data]);

  return (
    <Tabs
      key={visibleTabs.map((t) => t.key).join("|")}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: layout.tabBarHeight,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {visibleTabs.map((tab) => (
        <Tabs.Screen
          key={tab.key}
          name={tab.key}
          options={{
            title: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? (tab as any).iconActive : tab.icon} color={color} />
            ),
            ...(tab.key === "cart"
              ? {
                  tabBarBadge: cartCount > 0 ? cartCount : undefined,
                  tabBarBadgeStyle: {
                    backgroundColor: colors.accent,
                    color: "#111",
                    fontWeight: "700",
                  } as any,
                }
              : {}),
            ...(tab.key === "orders"
              ? {
                  tabBarBadge: unreadPaymentRequestedCount > 0 ? "!" : undefined,
                  tabBarBadgeStyle: {
                    backgroundColor: colors.accent,
                    color: "#111",
                    fontWeight: "800",
                  } as any,
                }
              : {}),
          }}
        />
      ))}
    </Tabs>
  );
}


