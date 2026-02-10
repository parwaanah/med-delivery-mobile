import { useCallback, useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text, Card, PrimaryButton, Input, colors, spacing, useToast, ScreenScroll, HeartRateLoader } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { getLegalGate } from "../lib/legalGate";
import * as Haptics from "expo-haptics";
import { MedicalDisclaimerModal } from "../components/MedicalDisclaimerModal";
import { isDisclaimerAccepted, setDisclaimerAccepted } from "../lib/disclaimer";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../components/NetworkStateCard";
import { formatPrice } from "@mobile/utils";
import { LegalConsentModal } from "../components/LegalConsentModal";
import { track } from "@/lib/analytics";

type Address = {
  id: number;
  label?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pin: string;
  landmark?: string;
  isDefault?: boolean;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pin: "",
    landmark: "",
  });
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "COD">("ONLINE");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [cartSummary, setCartSummary] = useState<{ subtotal: number; couponCode?: string | null; couponDiscount?: number }>({
    subtotal: 0,
    couponCode: null,
    couponDiscount: 0,
  });
  const [cartCount, setCartCount] = useState(0);
  const [cartLoading, setCartLoading] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showLegal, setShowLegal] = useState(false);
  const [legalConfig, setLegalConfig] = useState<{ termsUrl?: string; privacyUrl?: string; version?: string; required?: boolean } | null>(
    null
  );
  const [pendingLegalThenCheckout, setPendingLegalThenCheckout] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  const loadAddresses = useCallback(async () => {
    if (!token || !user) {
      router.push("/(auth)/phone");
      return;
    }
    setInitialLoading(true);
    setError(null);
    try {
      const res = await Api.request<Address[]>("/users/me/addresses", { token });
      setAddresses(res || []);
      const def = res.find((a) => a.isDefault) || res[0];
      setSelectedId(def?.id ?? null);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to load addresses");
    } finally {
      setInitialLoading(false);
    }
  }, [token, user, router, logout]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const loadCartSummary = useCallback(async () => {
    if (!token) return;
    setCartLoading(true);
    try {
      const res = await Api.request<any>("/cart", { token });
      const items = Array.isArray(res?.items) ? res.items : [];
      setCartCount(items.reduce((sum: number, it: any) => sum + Number(it?.quantity || 0), 0));
      const subtotal = items.reduce((sum: number, it: any) => sum + Number(it?.price || 0) * Number(it?.quantity || 0), 0);
      const code = typeof res?.couponCode === "string" && res.couponCode.trim().length ? res.couponCode : null;
      const disc = res?.couponDiscount == null ? 0 : Number(res.couponDiscount);
      setCartSummary({ subtotal, couponCode: code, couponDiscount: Number.isFinite(disc) ? disc : 0 });
      setCouponInput(code || "");
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
      } else if (offline || /network request failed/i.test(String(e?.message || ""))) {
        setError("OFFLINE");
      }
    } finally {
      setCartLoading(false);
    }
  }, [token, logout, router, offline]);

  useEffect(() => {
    void loadCartSummary();
  }, [loadCartSummary]);

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
      await Api.request("/cart/apply-coupon", { method: "POST", token, body: { code: c } });
      await loadCartSummary();
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
      await loadCartSummary();
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

  const ensureLegalAccepted = async (): Promise<boolean> => {
    if (!token) return true;
    try {
      const gate = await getLegalGate(token);
      setLegalConfig((gate.config as any) || null);
      if (!gate.required || gate.accepted) return true;

      setShowLegal(true);
      return false;
    } catch {
      // If legal endpoints are unavailable, do not hard-block checkout (but still allow disclaimer gating).
      return true;
    }
  };

  const onCreateAddress = async () => {
    if (!token) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone is required");
      return;
    }
    if (!form.line1.trim() || !form.city.trim() || !form.pin.trim()) {
      setError("Address line 1, city and PIN are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Api.request("/users/me/addresses", {
        method: "POST",
        token,
        body: { ...form, isDefault: true },
      });
      setShowAdd(false);
      setForm({
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        pin: "",
        landmark: "",
      });
      await loadAddresses();
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to add address");
    } finally {
      setLoading(false);
    }
  };

  const actuallyCheckout = useCallback(async () => {
    if (!token) return;
    if (!selectedId) {
      setError("Select an address");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const order = await Api.request<any>("/cart/checkout", {
        method: "POST",
        token,
        body: { addressId: selectedId, paymentMode },
      });
      // Pay-after-accept: do NOT take payment on checkout.
      // The pharmacy will confirm availability/pricing and the app will unlock "Pay now" later.
      toast.show("Order placed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (order?.requiresPrescription) {
        toast.show("Prescription required");
        router.replace(`/prescriptions/attach?orderId=${order.id}`);
      } else {
        router.replace(`/order-confirmation?orderId=${order.id}`);
      }
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  }, [token, selectedId, paymentMode, toast, router, logout]);

  const onCheckout = async () => {
    track("begin_checkout", { source: "checkout" }, token).catch(() => {});
    if (!(await ensureLegalAccepted())) {
      setPendingLegalThenCheckout(true);
      return;
    }
    const accepted = await isDisclaimerAccepted().catch(() => true);
    if (!accepted) {
      setPendingCheckout(true);
      setShowDisclaimer(true);
      return;
    }
    await actuallyCheckout();
  };

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Checkout</Text>

      {cartLoading ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Cart</Text>
          <HeartRateLoader width={220} height={56} color={colors.primary} />
        </Card>
      ) : cartCount === 0 ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Your cart is empty</Text>
          <Text variant="body" color={colors.inkMuted}>
            Add items before checking out.
          </Text>
          <PrimaryButton title="Browse medicines" onPress={() => router.push("/search")} />
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="subtitle">Delivery address</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => router.push("/addresses")}>
              <Text variant="label" color={colors.primary}>
                Manage
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowAdd((v) => !v)}>
              <Text variant="label" color={colors.primary}>
                {showAdd ? "Cancel" : "Add new"}
              </Text>
            </Pressable>
          </View>
        </View>

        {initialLoading && !showAdd ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: spacing.md }}>
            <HeartRateLoader width={220} height={56} color={colors.primary} />
          </View>
        ) : addresses.length === 0 && !showAdd ? (
          <Text variant="body">No saved addresses.</Text>
        ) : null}

        {!showAdd && !initialLoading &&
          addresses.map((addr) => (
            <Pressable
              key={addr.id}
              onPress={() => setSelectedId(addr.id)}
              style={{
                padding: spacing.md,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selectedId === addr.id ? colors.primary : colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text variant="label">{addr.label || "Home"}</Text>
              <Text variant="body">{addr.name}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {addr.line1}, {addr.city} {addr.pin}
              </Text>
            </Pressable>
          ))}

        {showAdd ? (
          <View style={{ gap: spacing.sm }}>
            <Input label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
            <Input label="Address line 1" value={form.line1} onChangeText={(v) => setForm({ ...form, line1: v })} />
            <Input label="Address line 2" value={form.line2} onChangeText={(v) => setForm({ ...form, line2: v })} />
            <Input label="City" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
            <Input label="State" value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} />
            <Input label="PIN" value={form.pin} onChangeText={(v) => setForm({ ...form, pin: v })} />
            <Input label="Landmark" value={form.landmark} onChangeText={(v) => setForm({ ...form, landmark: v })} />
            <PrimaryButton title="Save address" onPress={onCreateAddress} loading={loading} />
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Payment</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {["ONLINE", "COD"].map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setPaymentMode(mode as any)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: paymentMode === mode ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: paymentMode === mode ? colors.primary : colors.border,
              }}
            >
              <Text variant="label" color={paymentMode === mode ? "#fff" : colors.ink}>
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Promo</Text>
        {cartSummary.couponCode ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">{cartSummary.couponCode}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                Discount: {formatPrice(cartSummary.couponDiscount || 0)}
              </Text>
            </View>
            <PrimaryButton title="Remove" variant="secondary" onPress={removeCoupon} loading={couponBusy} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Input
              label="Coupon code"
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
            <PrimaryButton title="Apply" onPress={applyCoupon} loading={couponBusy} />
          </View>
        )}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Summary</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="body">Subtotal</Text>
          <Text variant="subtitle">{formatPrice(cartSummary.subtotal || 0)}</Text>
        </View>
        {Number(cartSummary.couponDiscount || 0) > 0 ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="body">Discount</Text>
            <Text variant="subtitle" color={colors.primary}>
              -{formatPrice(Number(cartSummary.couponDiscount || 0))}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="body">Total</Text>
          <Text variant="subtitle">
            {formatPrice(Math.max(0, Number(cartSummary.subtotal || 0) - Number(cartSummary.couponDiscount || 0)))}
          </Text>
        </View>
      </Card>

      {error ? (
        error === "OFFLINE" || offline ? (
          <NetworkStateCard
            title="Poor connection"
            body="Reconnect and retry."
            onRetry={loadAddresses}
          />
        ) : (
          <Text variant="body" color={colors.danger}>
            {error}
          </Text>
        )
      ) : null}

      <PrimaryButton
        title={offline ? "Offline" : "Place order"}
        onPress={onCheckout}
        loading={loading}
        disabled={offline || initialLoading || cartLoading || cartCount === 0}
      />
      <Text variant="caption" color={colors.inkMuted} style={{ textAlign: "center", marginTop: -6 }}>
        {"You'll pay after the pharmacy accepts and confirms availability."}
      </Text>

      <MedicalDisclaimerModal
        visible={showDisclaimer}
        onClose={() => {
          setShowDisclaimer(false);
          setPendingCheckout(false);
        }}
        onAccept={async () => {
          await setDisclaimerAccepted().catch(() => {});
          setShowDisclaimer(false);
          if (pendingCheckout) {
            setPendingCheckout(false);
            await actuallyCheckout();
          }
        }}
      />

      <LegalConsentModal
        visible={showLegal}
        version={legalConfig?.version}
        termsUrl={legalConfig?.termsUrl}
        privacyUrl={legalConfig?.privacyUrl}
        onClose={() => {
          setShowLegal(false);
          setPendingLegalThenCheckout(false);
        }}
        onAccept={async () => {
          if (!token) return;
          try {
            const config = legalConfig || (await Api.request<any>("/legal/config", { token }));
            const version = config?.version;
            await Api.request("/legal/accept", { method: "POST", token, body: { version } });
            setShowLegal(false);
            if (pendingLegalThenCheckout) {
              setPendingLegalThenCheckout(false);
              await onCheckout();
            }
          } catch (e: any) {
            setError(e?.message || "Failed to accept terms");
          }
        }}
      />
    </ScreenScroll>
  );
}


