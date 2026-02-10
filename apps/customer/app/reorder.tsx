import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Card, colors, spacing, ScreenScroll, PrimaryButton } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type OrderLike = any;

export default function ReorderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const orderId = params.orderId ? Number(params.orderId) : NaN;

  const [order, setOrder] = useState<OrderLike | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
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
        if (active) setError(e?.message || "Failed to load order");
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
    return list
      .map((it: any) => ({
        medicineId: Number(it?.medicineId || it?.medicine?.id || it?.id),
        name: String(it?.medicine?.name || it?.name || "Item"),
        quantity: Math.max(1, Number(it?.quantity || it?.qty || 1)),
      }))
      .filter((it: any) => Number.isFinite(it.medicineId));
  }, [order]);

  const onAddAllToCart = useCallback(async () => {
    if (!token || !Number.isFinite(orderId) || items.length === 0) return;
    setBusy(true);
    try {
      for (const it of items) {
        await Api.request("/cart/add", {
          method: "POST",
          token,
          body: { medicineId: it.medicineId, quantity: it.quantity },
        });
      }
      Alert.alert("Added to cart", "Review your cart before checkout.", [
        { text: "Continue browsing", style: "cancel", onPress: () => router.back() },
        { text: "Go to cart", onPress: () => router.push("/(tabs)/cart") },
      ]);
    } catch (e: any) {
      Alert.alert("Reorder failed", e?.message || "Unable to add items to cart.");
    } finally {
      setBusy(false);
    }
  }, [token, orderId, items, router]);

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ gap: 2 }}>
          <Text variant="titleLarge">Reorder</Text>
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
            Loading…
          </Text>
        </Card>
      ) : error ? (
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text variant="body">{error}</Text>
          <PrimaryButton title="Try again" onPress={() => router.replace(`/reorder?orderId=${encodeURIComponent(String(orderId))}`)} />
        </Card>
      ) : items.length === 0 ? (
        <Card style={{ padding: spacing.lg }}>
          <Text variant="body" color={colors.inkMuted}>
            No items to reorder.
          </Text>
        </Card>
      ) : (
        <>
          <Card style={{ gap: spacing.sm }}>
            <Text variant="subtitle">Items</Text>
            <View style={{ gap: 10 }}>
              {items.map((it: any) => (
                <View
                  key={`${it.medicineId}`}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text variant="body">{it.name}</Text>
                    <Text variant="caption" color={colors.inkMuted}>
                      Qty {it.quantity}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          <PrimaryButton title="Add all to cart" onPress={onAddAllToCart} loading={busy} />
          <PrimaryButton title="Back" variant="secondary" onPress={() => router.back()} />
        </>
      )}
    </ScreenScroll>
  );
}
