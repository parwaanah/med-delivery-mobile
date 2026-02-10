import { Tabs } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, layout } from "@mobile/ui";
import { useQuery } from "@tanstack/react-query";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";

function TabIcon({ name, color }: { name: any; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:3001";

const TAB_CATALOG = [
  { key: "index", title: "Home", icon: "home" },
  { key: "cart", title: "Cart", icon: "cart" },
  { key: "orders", title: "Order", icon: "file-tray" },
  { key: "lab", title: "Lab Test", icon: "flask" },
  { key: "offers", title: "Offers", icon: "pricetags" },
  { key: "profile", title: "Profile", icon: "person-circle" },
];

export default function TabLayout() {
  const [tabsConfig, setTabsConfig] = useState<string[] | null>(null);
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/config/mobile-tabs`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data?.tabs) && data.tabs.length > 0) {
          setTabsConfig(data.tabs.map((t: any) => String(t)));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const visibleTabs = useMemo(() => {
    if (!tabsConfig) return TAB_CATALOG;
    const allowed = new Set(TAB_CATALOG.map((t) => t.key));
    const ordered = tabsConfig.filter((t) => allowed.has(t));
    if (ordered.length === 0) return TAB_CATALOG;
    return ordered.map((key) => TAB_CATALOG.find((t) => t.key === key)!).filter(Boolean);
  }, [tabsConfig]);

  const cartQuery = useQuery({
    queryKey: ["cart", token],
    enabled: Boolean(token) && String(user?.role || "").toUpperCase() === "CUSTOMER",
    queryFn: () => Api.request<any>("/cart", { token: token || undefined }),
    staleTime: 15_000,
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
            tabBarIcon: ({ color }) => <TabIcon name={tab.icon} color={color} />,
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


