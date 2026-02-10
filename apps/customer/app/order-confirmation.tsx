import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Card, colors, spacing, ScreenScroll, PrimaryButton, HeartRateLoader } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { formatPrice } from "@mobile/utils";

type OrderLike = any;

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const orderId = params.orderId ? Number(params.orderId) : NaN;

  const [order, setOrder] = useState<OrderLike | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) return;
    let active = true;
    setLoading(true);
    Api.request(`/orders/${orderId}`, { token })
      .then((o) => {
        if (active) setOrder(o);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, orderId]);

  const total = useMemo(() => {
    if (typeof order?.totalPrice === "number") return order.totalPrice;
    if (typeof order?.total === "number") return order.total;
    return null;
  }, [order]);

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Card style={{ gap: spacing.md, alignItems: "center", paddingVertical: spacing.xl }}>
        <HeartRateLoader color={colors.primary} />
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text variant="titleLarge">Order placed</Text>
          <Text variant="body" color={colors.inkMuted} style={{ textAlign: "center" }}>
            The pharmacy will confirm availability and pricing. You’ll be asked to pay only after acceptance.
          </Text>
        </View>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Order</Text>
        {Number.isFinite(orderId) ? (
          <Text variant="body" color={colors.inkMuted}>
            Order #{orderId}
          </Text>
        ) : null}
        {loading ? (
          <Text variant="caption" color={colors.inkMuted}>
            Loading summary…
          </Text>
        ) : total != null ? (
          <Text variant="label">Estimated total: {formatPrice(total)}</Text>
        ) : null}
      </Card>

      <PrimaryButton
        title="Track order"
        onPress={() => {
          if (!Number.isFinite(orderId)) return;
          router.replace(`/orders/${orderId}`);
        }}
      />
      <PrimaryButton title="Go home" variant="secondary" onPress={() => router.replace("/")} />
    </ScreenScroll>
  );
}
