import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Text, Card, PrimaryButton, colors, spacing, Screen, Skeleton, layout } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../../components/NetworkStateCard";
import { formatPrice } from "@mobile/utils";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_STATUSES = new Set([
  "CREATED",
  "PENDING",
  "CONFIRMED",
  "ORDER_CREATED",
  "PHARMACY_ACCEPTED",
  "PHARMACY_MARKED_READY",
  "RIDER_ASSIGNED",
  "OUT_FOR_DELIVERY",
  "PAYMENT_REQUESTED",
  "PAYMENT_PENDING",
]);

const DONE_STATUSES = new Set([
  "DELIVERED",
  "CANCELLED",
  "CANCELED",
  "REJECTED",
  "FAILED",
]);

function normalizeStatus(value: any) {
  return String(value || "").trim().toUpperCase();
}

type Row =
  | { type: "header"; title: string }
  | { type: "order"; order: any };

const SkeletonRow = () => (
  <Card style={{ gap: 8 }}>
    <Skeleton width={140} height={14} radius={8} />
    <Skeleton width={90} height={12} radius={8} />
    <Skeleton width={70} height={12} radius={8} />
  </Card>
);

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  const load = useCallback(async () => {
    if (!token || !user) {
      router.push("/(auth)/phone");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await Api.request<any[]>("/orders", { token });
      setOrders(res || []);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      const msg = e?.message || "Failed to load orders";
      if (offline || /network request failed/i.test(String(msg))) setError("OFFLINE");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, user, router, logout, offline]);

  useEffect(() => {
    load();
  }, [load, retryTick]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const { active, history } = useMemo(() => {
    const activeOrders: any[] = [];
    const historyOrders: any[] = [];
    for (const o of orders) {
      const s = normalizeStatus(o?.status);
      if (DONE_STATUSES.has(s)) historyOrders.push(o);
      else if (ACTIVE_STATUSES.has(s)) activeOrders.push(o);
      else activeOrders.push(o);
    }
    return { active: activeOrders, history: historyOrders };
  }, [orders]);

  const rows: Row[] = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const out: Row[] = [];
    if (active.length > 0) {
      out.push({ type: "header", title: "Active" });
      active.forEach((o) => out.push({ type: "order", order: o }));
    }
    if (history.length > 0) {
      out.push({ type: "header", title: "History" });
      history.forEach((o) => out.push({ type: "order", order: o }));
    }
    return out;
  }, [orders, active, history]);

  return (
    <Screen padded={false}>
      <FlashList
        data={loading ? (new Array(6).fill(null) as any[]) : rows}
        keyExtractor={(item: any, index) => (item ? `${item.type}-${item.type === "order" ? item.order?.id : item.title}` : `s-${index}`)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          gap: spacing.md,
          paddingBottom: Math.max(spacing.xl, insets.bottom) + layout.tabBarHeight + 24,
        }}
        ListHeaderComponent={
          <View style={{ paddingTop: spacing.lg }}>
            <Text variant="titleLarge">Orders</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (!item) return <SkeletonRow />;

          if (item.type === "header") {
            return (
              <View style={{ paddingTop: spacing.sm }}>
                <Text variant="subtitle" color={colors.inkMuted}>
                  {item.title}
                </Text>
              </View>
            );
          }

          const order = item.order;
          const status = normalizeStatus(order?.status);
          const paymentStatus = normalizeStatus(order?.paymentStatus);
          const itemsCount = Array.isArray(order?.items) ? order.items.length : Number(order?.itemsCount || 0);
          const total = order?.total ?? order?.amount ?? null;
          const totalLabel = typeof total === "number" ? formatPrice(total) : total != null ? String(total) : null;
          const payNow = paymentStatus === "REQUESTED" || status === "PAYMENT_REQUESTED";

          return (
            <Pressable onPress={() => router.push(`/orders/${order.id}`)}>
              <Card style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text variant="subtitle">Order #{order.id}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {payNow ? (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 999,
                          backgroundColor: "rgba(251,176,59,0.18)",
                          borderWidth: 1,
                          borderColor: "rgba(251,176,59,0.28)",
                        }}
                      >
                        <Text variant="caption" color={colors.ink}>
                          Pay now
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: DONE_STATUSES.has(status) ? colors.primarySoft : "rgba(255,255,255,0.10)",
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text variant="caption" color={DONE_STATUSES.has(status) ? colors.ink : colors.inkMuted}>
                        {String(order.status || "").replaceAll("_", " ")}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text variant="caption" color={colors.inkMuted}>
                  {itemsCount} items{totalLabel ? ` â€¢ ${totalLabel}` : ""}
                </Text>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          !loading && error === "OFFLINE" && rows.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <NetworkStateCard
                title={offline ? "You're offline" : "Poor connection"}
                body="You can still view your orders. Reconnect and tap retry to refresh."
                onRetry={() => setRetryTick((v) => v + 1)}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            error ? (
              <Card style={{ gap: spacing.sm }}>
                {error === "OFFLINE" ? (
                  <NetworkStateCard
                    title={offline ? "You're offline" : "Poor connection"}
                    body="Reconnect and tap retry to refresh your orders."
                    onRetry={() => setRetryTick((v) => v + 1)}
                  />
                ) : (
                  <Text variant="body" color={colors.danger}>
                    {error}
                  </Text>
                )}
              </Card>
            ) : (
              <Card style={{ gap: spacing.sm }}>
                <Text variant="subtitle">No orders yet</Text>
                <Text variant="body" color={colors.inkMuted}>
                  Your active and past orders will show here.
                </Text>
                <PrimaryButton title="Browse medicines" onPress={() => router.push("/search")} />
              </Card>
            )
          ) : null
        }
      />
    </Screen>
  );
}
