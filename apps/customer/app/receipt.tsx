import { useEffect, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Card, colors, spacing, ScreenScroll, PrimaryButton } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { formatPrice } from "@mobile/utils";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type OrderLike = any;

export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const orderId = params.orderId ? Number(params.orderId) : NaN;

  const [order, setOrder] = useState<OrderLike | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) return;
    let active = true;
    setLoading(true);
    setError(null);
    Api.request(`/orders/${orderId}`, { token })
      .then((o) => {
        if (active) setOrder(o);
      })
      .catch((e: any) => {
        if (active) setError(e?.message || "Failed to load receipt");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, orderId]);

  const items = useMemo(() => {
    const list = Array.isArray(order?.items) ? order.items : Array.isArray(order?.orderItems) ? order.orderItems : [];
    return list;
  }, [order]);

  const totals = useMemo(() => {
    const subtotal =
      typeof order?.subtotal === "number"
        ? order.subtotal
        : typeof order?.itemsTotal === "number"
          ? order.itemsTotal
          : null;
    const discount = order?.couponDiscount != null ? Number(order.couponDiscount) : null;
    const total =
      typeof order?.totalPrice === "number"
        ? order.totalPrice
        : typeof order?.total === "number"
          ? order.total
          : null;
    return { subtotal, discount, total };
  }, [order]);

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ gap: 2 }}>
          <Text variant="titleLarge">Receipt</Text>
          {Number.isFinite(orderId) ? (
            <Text variant="caption" color={colors.inkMuted}>
              Order #{orderId}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MaterialCommunityIcons name="close" size={18} color={colors.inkMuted} />
        </Pressable>
      </View>

      {loading ? (
        <Card style={{ padding: spacing.lg }}>
          <Text variant="body" color={colors.inkMuted}>
            Loading receipt…
          </Text>
        </Card>
      ) : error ? (
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text variant="body">{error}</Text>
          <PrimaryButton title="Try again" onPress={() => router.replace(`/receipt?orderId=${encodeURIComponent(String(orderId))}`)} />
        </Card>
      ) : !order ? (
        <Card style={{ padding: spacing.lg }}>
          <Text variant="body" color={colors.inkMuted}>
            No receipt available.
          </Text>
        </Card>
      ) : (
        <>
          <Card style={{ gap: spacing.sm }}>
            <Text variant="subtitle">Items</Text>
            {items.length === 0 ? (
              <Text variant="body" color={colors.inkMuted}>
                No items found.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {items.map((it: any, idx: number) => {
                  const name = String(it?.medicine?.name || it?.name || "Item");
                  const qty = Number(it?.quantity || it?.qty || 1);
                  const unit = it?.price != null ? Number(it.price) : it?.unitPrice != null ? Number(it.unitPrice) : null;
                  const line = unit != null ? unit * qty : null;
                  return (
                    <View
                      key={`${name}-${idx}`}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text variant="body">{name}</Text>
                        <Text variant="caption" color={colors.inkMuted}>
                          Qty {qty}
                        </Text>
                      </View>
                      <Text variant="label">{line != null ? formatPrice(line) : "-"}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <Text variant="subtitle">Summary</Text>
            {totals.subtotal != null ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body" color={colors.inkMuted}>
                  Subtotal
                </Text>
                <Text variant="body">{formatPrice(totals.subtotal)}</Text>
              </View>
            ) : null}
            {order?.couponCode ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body" color={colors.inkMuted}>
                  Coupon ({String(order.couponCode)})
                </Text>
                <Text variant="body">
                  {totals.discount != null ? `-${formatPrice(totals.discount)}` : "-"}
                </Text>
              </View>
            ) : null}
            {totals.total != null ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="label">Total</Text>
                <Text variant="label">{formatPrice(totals.total)}</Text>
              </View>
            ) : null}
          </Card>

          <PrimaryButton title="Back to order" onPress={() => router.push(`/orders/${orderId}`)} />
        </>
      )}
    </ScreenScroll>
  );
}
