import { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text, Card, PrimaryButton, Input, colors, spacing, Screen, HeartRateLoader, useToast } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "@mobile/utils";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../components/NetworkStateCard";
import { track } from "@/lib/analytics";

type CartItem = {
  id: string;
  quantity: number;
  price: number;
  medicine?: { id: number; name: string; category?: string };
};

type CartResponse = {
  items: CartItem[];
  couponCode?: string | null;
  couponDiscount?: number | string | null;
};

export default function CartScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [couponBusy, setCouponBusy] = useState(false);

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
    if (String(user.role || "").toUpperCase() !== "CUSTOMER") {
      setItems([]);
      setError("Cart is only available for customer accounts.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await Api.request<CartResponse>("/cart", { token });
      setItems(res.items || []);
      const code = typeof res.couponCode === "string" && res.couponCode.trim().length ? res.couponCode : null;
      setCouponCode(code);
      setCouponInput(code || "");
      const disc = res.couponDiscount == null ? 0 : Number(res.couponDiscount);
      setCouponDiscount(Number.isFinite(disc) ? disc : 0);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      if (e?.status === 403) {
        setError("Cart is only available for customer accounts.");
        return;
      }
      setError(e?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [token, user, router, logout]);

  useEffect(() => {
    void load();
  }, [load, retryTick]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0),
    [items]
  );
  const total = useMemo(() => Math.max(0, subtotal - couponDiscount), [subtotal, couponDiscount]);

  const updateQty = async (item: CartItem, delta: number) => {
    try {
      const nextQty = Math.max(1, item.quantity + delta);
      await Api.request("/cart/update", {
        method: "POST",
        token: token || undefined,
        body: { cartItemId: item.id, quantity: nextQty },
      });
      await load();
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to update cart");
    }
  };

  const removeItem = async (item: CartItem) => {
    try {
      await Api.request("/cart/remove", {
        method: "POST",
        token: token || undefined,
        body: { cartItemId: item.id },
      });
      await load();
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to remove item");
    }
  };

  const applyCoupon = async () => {
    if (!token) return;
    if (offline) {
      setCouponError("You're offline. Reconnect and try again.");
      return;
    }
    const c = couponInput.trim().toUpperCase();
    if (!c) {
      setCouponError("Enter a coupon code");
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      await Api.request("/cart/apply-coupon", {
        method: "POST",
        token,
        body: { code: c },
      });
      await load();
      setCouponError(null);
      toast.show(`Applied ${c}`);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setCouponError(e?.message || "Coupon could not be applied");
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = async () => {
    if (!token) return;
    if (offline) {
      setCouponError("You're offline. Reconnect and try again.");
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      await Api.request("/cart/remove-coupon", { method: "POST", token });
      setCouponInput("");
      await load();
      setCouponError(null);
      toast.show("Coupon removed");
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setCouponError(e?.message || "Failed to remove coupon");
    } finally {
      setCouponBusy(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: 140 }}
      >
        <Text variant="titleLarge">Cart</Text>
        {loading ? (
          <Card>
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: spacing.md }}>
              <HeartRateLoader width={220} height={56} color={colors.primary} />
            </View>
          </Card>
        ) : error ? (
          <Card>
            {offline ? (
              <NetworkStateCard
                title="You're offline"
                body="Reconnect and tap retry to refresh your cart."
                onRetry={() => setRetryTick((v) => v + 1)}
              />
            ) : (
              <Text color={colors.danger}>{error}</Text>
            )}
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <Text>Your cart is empty.</Text>
            <PrimaryButton title="Browse" onPress={() => router.push("/search")} />
          </Card>
        ) : (
          <>
            <Card style={{ gap: spacing.md }}>
              <Text variant="subtitle">Coupon</Text>
              {couponCode ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="label">{couponCode}</Text>
                    <Text variant="caption" color={colors.inkMuted}>
                      Discount: {formatPrice(couponDiscount)}
                    </Text>
                  </View>
                  <PrimaryButton title="Remove" variant="secondary" onPress={removeCoupon} loading={couponBusy} />
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Input
                    label="Have a code?"
                    value={couponInput}
                    autoCapitalize="characters"
                    onChangeText={setCouponInput}
                    placeholder="e.g. SAVE10"
                  />
                  {couponError ? (
                    <Text variant="caption" color={colors.danger}>
                      {couponError}
                    </Text>
                  ) : null}
                  <PrimaryButton title="Apply coupon" onPress={applyCoupon} loading={couponBusy} />
                </View>
              )}
            </Card>

            <View style={{ gap: spacing.md }}>
              {items.map((item) => (
                <Card key={item.id} style={{ gap: spacing.sm }}>
                  <Text variant="subtitle">{item.medicine?.name || "Item"}</Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {item.medicine?.category || "NON_RX"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text variant="subtitle">{formatPrice(Number(item.price || 0))}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable onPress={() => updateQty(item, -1)}>
                        <Ionicons name="remove-circle-outline" size={22} color={colors.primary} />
                      </Pressable>
                      <Text variant="body">{item.quantity}</Text>
                      <Pressable onPress={() => updateQty(item, 1)}>
                        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => removeItem(item)}>
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              ))}
            </View>

            <Card style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body">Subtotal</Text>
                <Text variant="subtitle">{formatPrice(subtotal)}</Text>
              </View>
              {couponDiscount > 0 ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="body">Coupon discount</Text>
                  <Text variant="subtitle" color={colors.primary}>
                    -{formatPrice(couponDiscount)}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body">Delivery</Text>
                <Text variant="body">Free</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body">Taxes</Text>
                <Text variant="body">{formatPrice(0)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body">Total</Text>
                <Text variant="subtitle">{formatPrice(total)}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      {!loading && items.length > 0 ? (
        <View
          style={{
            position: "absolute",
            left: spacing.xl,
            right: spacing.xl,
            bottom: 16,
          }}
        >
          <Card style={{ padding: spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text variant="caption" color={colors.inkMuted}>
                  Total
                </Text>
                <Text variant="subtitle">{formatPrice(total)}</Text>
              </View>
              <PrimaryButton
                title="Checkout"
                onPress={() => {
                  track("begin_checkout", { source: "cart" }, token).catch(() => {});
                  router.push("/checkout");
                }}
              />
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
