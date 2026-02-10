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

const TABS_CACHE_KEY = "app_config_mobile_tabs_v3";

const TAB_CATALOG = [
  { key: "index", title: "Home", icon: "home-outline" },
  { key: "orders", title: "Orders", icon: "file-tray-outline" },
  { key: "lab", title: "Lab Test", icon: "flask-outline" },
  { key: "cart", title: "Cart", icon: "cart-outline" },
  { key: "offers", title: "Offers", icon: "pricetag-outline" },
  { key: "profile", title: "Profile", icon: "person-outline" },
] as const;

type TabKey = (typeof TAB_CATALOG)[number]["key"];
type TabConfig = { key: TabKey; title: string; icon: string; enabled: boolean };

export default function TabLayout() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [tabsConfigCached, setTabsConfigCached] = useState<TabConfig[] | null>(null);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(TABS_CACHE_KEY)
      .then((raw) => {
        if (!active) return;
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Back-compat: cached string[]
            if (parsed.length && typeof parsed[0] === "string") {
              const allowed = new Set<TabKey>(TAB_CATALOG.map((t) => t.key));
              const ordered = Array.from(new Set(parsed.map((t: any) => String(t))))
                .map((t) => String(t))
                .filter((t) => allowed.has(t as TabKey)) as TabKey[];
              const out = ordered
                .map((k) => TAB_CATALOG.find((t) => t.key === k))
                .filter(Boolean)
                .map((t) => ({ key: (t as any).key, title: (t as any).title, icon: (t as any).icon, enabled: true } as TabConfig));
              if (out.length) setTabsConfigCached(out);
            } else {
              const out = parsed
                .map((t: any) => ({
                  key: String(t?.key || "").trim(),
                  title: String(t?.title || "").trim(),
                  icon: String(t?.icon || "").trim(),
                  enabled: t?.enabled !== false,
                }))
                .filter((t: any) => t.key && t.title && t.icon);
              if (out.length) setTabsConfigCached(out as TabConfig[]);
            }
          }
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
      const raw = Array.isArray(res?.tabs) ? res.tabs : null;
      const tabs: TabConfig[] | null =
        raw && raw.length && typeof raw[0] === "object"
          ? (raw
              .map((t: any) => ({
                key: String(t?.key || "").trim(),
                title: String(t?.title || "").trim(),
                icon: String(t?.icon || "").trim(),
                enabled: t?.enabled !== false,
              }))
              .filter((t: any) => t.key && t.title && t.icon) as any)
          : raw && raw.length && typeof raw[0] === "string"
            ? (raw
                .map((k: any) => TAB_CATALOG.find((t) => t.key === String(k)) || null)
                .filter(Boolean)
                .map((t: any) => ({ key: t.key, title: t.title, icon: t.icon, enabled: true })) as any)
            : null;

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
    if (!__DEV__) return;
    const data = tabsConfigQuery.data;
    const cached = tabsConfigCached;
    // eslint-disable-next-line no-console
    console.log("[tabs] apiBase=", Api.baseUrl);
    // eslint-disable-next-line no-console
    console.log("[tabs] query status=", tabsConfigQuery.status, "fetchStatus=", (tabsConfigQuery as any).fetchStatus);
    // eslint-disable-next-line no-console
    console.log("[tabs] data keys=", Array.isArray(data) ? data.map((t: any) => t?.key) : data);
    // eslint-disable-next-line no-console
    console.log("[tabs] cached keys=", Array.isArray(cached) ? cached.map((t: any) => t?.key) : cached);
    // eslint-disable-next-line no-console
    console.log("[tabs] error=", (tabsConfigQuery.error as any)?.message, (tabsConfigQuery.error as any)?.status);
  }, [tabsConfigQuery.status, (tabsConfigQuery as any).fetchStatus, tabsConfigQuery.data, tabsConfigCached, tabsConfigQuery.error]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tabsConfigQuery.refetch().catch(() => {});
    });
    return () => sub.remove();
  }, [tabsConfigQuery]);

  const visibleTabs = useMemo(() => {
    const cfg = tabsConfigQuery.data ?? tabsConfigCached ?? null;
    if (!cfg) return TAB_CATALOG.map((t) => ({ ...t, enabled: true } as TabConfig));

    const allowed = new Set<TabKey>(TAB_CATALOG.map((t) => t.key));
    const seen = new Set<string>();

    const normalized = cfg
      .map((t: any) => ({
        key: String(t?.key || "").trim() as TabKey,
        title: String(t?.title || "").trim(),
        icon: String(t?.icon || "").trim(),
        enabled: t?.enabled !== false,
      }))
      .filter((t: any) => allowed.has(t.key))
      .filter((t: any) => {
        const k = String(t.key);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((t: any) => {
        const fallback = TAB_CATALOG.find((x) => x.key === t.key)!;
        return {
          key: t.key,
          title: t.title || fallback.title,
          icon: t.icon || fallback.icon,
          enabled: t.enabled !== false,
        } as TabConfig;
      });

    const enabled = normalized.filter((t: any) => t.enabled !== false);
    if (enabled.length) return enabled;
    return TAB_CATALOG.map((t) => ({ ...t, enabled: true } as TabConfig));
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

  const enabledKeys = useMemo(() => new Set(visibleTabs.map((t) => t.key)), [visibleTabs]);
  const configByKey = useMemo(() => new Map(visibleTabs.map((t) => [t.key, t])), [visibleTabs]);

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
      {TAB_CATALOG.map((fallback) => {
        const enabled = enabledKeys.has(fallback.key);
        const tab = (configByKey.get(fallback.key) as TabConfig | undefined) || ({
          key: fallback.key,
          title: fallback.title,
          icon: fallback.icon,
          enabled: true,
        } as TabConfig);

        return (
          <Tabs.Screen
            key={fallback.key}
            name={fallback.key}
            options={{
              // Important: hide disabled tabs completely (expo-router will otherwise auto-add them).
              ...(enabled ? {} : { href: null }),
              title: tab.title,
              tabBarLabel: tab.title,
              tabBarIcon: ({ color }) => <TabIcon name={tab.icon} color={color} />,
              ...(fallback.key === "cart" && enabled
                ? {
                    tabBarBadge: cartCount > 0 ? cartCount : undefined,
                    tabBarBadgeStyle: {
                      backgroundColor: colors.accent,
                      color: "#111",
                      fontWeight: "700",
                    } as any,
                  }
                : {}),
              ...(fallback.key === "orders" && enabled
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
        );
      })}
    </Tabs>
  );
}


