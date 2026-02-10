import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Alert, Linking, Pressable, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Card, PrimaryButton, colors, spacing, ScreenScroll, HeartRateLoader } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { getLegalGate } from "../../lib/legalGate";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../../components/NetworkStateCard";
import { Image } from "expo-image";
import { formatPrice } from "@mobile/utils";
import { isLiveMapAvailable, LiveTrackingMap } from "../../components/LiveTrackingMap";
import { getRouteOsrm } from "../../lib/routing";

type TimelineEvent = { event: string; createdAt?: string; at?: string; data?: any };
type Tracking = {
  status?: string;
  updatedAt?: string;
  etaMinutes?: number;
  distanceKm?: number;
  rider?: { id?: number; name?: string; phone?: string; latitude?: number; longitude?: number } | null;
  destination?: { latitude?: number; longitude?: number; lat?: number; lng?: number } | null;
};

const MAIN_EVENTS = [
  "ORDER_CREATED",
  "PHARMACY_ACCEPTED",
  "PHARMACY_MARKED_READY",
  "RIDER_ASSIGNED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const TRACKING_POLL_STATUSES = new Set([
  "ACCEPTED",
  "PHARMACY_ACCEPTED",
  "RIDER_ASSIGNED",
  "OUT_FOR_DELIVERY",
  "PAYMENT_REQUESTED",
  "PAYMENT_PENDING",
]);

const FRIENDLY_EVENT: Record<string, string> = {
  ORDER_CREATED: "Order placed",
  PHARMACY_ACCEPTED: "Pharmacy accepted",
  PHARMACY_MARKED_READY: "Ready for pickup",
  RIDER_ASSIGNED: "Rider assigned",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

const CANCELLABLE = new Set([
  "CREATED",
  "PENDING",
  "CONFIRMED",
  "ORDER_CREATED",
  "PAYMENT_REQUESTED",
  "PAYMENT_PENDING",
]);

function pickEventTime(t: TimelineEvent) {
  return t.createdAt || t.at;
}

function fmtDateMaybe(v?: string) {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString();
  } catch {
    return null;
  }
}

function normalizeStatus(value: any) {
  return String(value || "").trim().toUpperCase();
}

function pickLatLng(v: any): { latitude: number; longitude: number } | null {
  const lat = v?.latitude ?? v?.lat;
  const lng = v?.longitude ?? v?.lng;
  const latitude = lat != null ? Number(lat) : NaN;
  const longitude = lng != null ? Number(lng) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function dist2(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const dx = a.latitude - b.latitude;
  const dy = a.longitude - b.longitude;
  return dx * dx + dy * dy;
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function snapToRoute(
  point: { latitude: number; longitude: number },
  route: { latitude: number; longitude: number }[],
) {
  if (!Array.isArray(route) || route.length < 2) return point;
  let best = route[0];
  let bestD = dist2(point, best);
  for (let i = 1; i < route.length; i++) {
    const d = dist2(point, route[i]);
    if (d < bestD) {
      bestD = d;
      best = route[i];
    }
  }
  return best;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<
    "Changed my mind" | "Found cheaper elsewhere" | "Ordered by mistake" | "Delivery too slow" | "Other"
  >("Changed my mind");
  const [cancelReasonOther, setCancelReasonOther] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [route, setRoute] = useState<{
    coords: { latitude: number; longitude: number }[];
    etaMinutes: number | null;
    distanceKm: number | null;
  } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const lastRouteReq = useRef<{ at: number; from: { latitude: number; longitude: number }; to: { latitude: number; longitude: number } } | null>(
    null
  );

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  const loadTracking = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!token || !id) return;

      if (!silent) {
        setTrackingLoading(true);
        setTrackingError(null);
      }

      try {
        const tr = await Api.request<Tracking>(`/orders/${id}/tracking`, { token });
        setTracking(tr || null);
        if (!silent) setTrackingError(null);
      } catch (e: any) {
        const msg = e?.message || "Unable to load tracking";
        const normalized = offline || /network request failed/i.test(String(msg)) ? "OFFLINE" : String(msg);

        // Keep last-known tracking when refresh fails.
        if (!silent) setTrackingError(normalized);
      } finally {
        if (!silent) setTrackingLoading(false);
      }
    },
    [token, id, offline]
  );

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await Api.request<any>(`/orders/${id}`, { token });
        setOrder(res);
        const tl = await Api.request<any>(`/orders/${id}/timeline`, { token });
        setTimeline(Array.isArray(tl) ? tl : []);
        await loadTracking({ silent: true });
      } catch (e: any) {
        if (e?.status === 401) {
          await logout();
          router.replace("/(auth)/phone");
          return;
        }
        const msg = e?.message || "Failed to load order";
        if (offline || /network request failed/i.test(String(msg))) setError("OFFLINE");
        else setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id, token, offline, retryTick, loadTracking, logout, router]);

  // Poll tracking while the order is in active delivery states.
  useEffect(() => {
    if (!token || !id) return;
    const s = normalizeStatus(order?.status);
    if (!TRACKING_POLL_STATUSES.has(s)) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      await loadTracking({ silent: true });
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, id, order?.status, loadTracking]);

  const mainTimeline = useMemo(
    () => timeline.filter((t) => MAIN_EVENTS.includes(String(t.event || ""))),
    [timeline]
  );

  const pricingChange = useMemo(() => {
    const st = normalizeStatus(order?.status);
    if (st !== "NEEDS_CONFIRMATION") return null;

    const reversed = timeline.slice().reverse();
    const ev =
      reversed.find((t) => String(t.event || "").toUpperCase() === "PHARMACY_PRICED") ||
      reversed.find((t) => String(t.event || "").toUpperCase() === "ORDER_NEEDS_CONFIRMATION");

    const data = ev?.data && typeof ev.data === "object" ? ev.data : null;
    const pricedItems = Array.isArray(data?.pricedItems) ? data.pricedItems : [];
    const missingItems = Array.isArray(data?.missingItems) ? data.missingItems : [];

    const subtotal = Number(data?.subtotal ?? NaN);
    const couponDiscount = Number(data?.couponDiscount ?? NaN);
    const totalPrice = Number(data?.totalPrice ?? NaN);

    return {
      at: pickEventTime(ev || ({} as any)) || null,
      pricedItems,
      missingItems,
      subtotal: Number.isFinite(subtotal) ? subtotal : null,
      couponDiscount: Number.isFinite(couponDiscount) ? couponDiscount : null,
      totalPrice: Number.isFinite(totalPrice) ? totalPrice : null,
    };
  }, [order?.status, timeline]);

  const cancelAllowed = useMemo(() => {
    const s = normalizeStatus(order?.status);
    return Boolean(id) && Boolean(token) && CANCELLABLE.has(s);
  }, [order?.status, id, token]);

  const paymentInfo = useMemo(() => {
    const orderStatus = normalizeStatus(order?.status);
    const paymentStatus = normalizeStatus(order?.paymentStatus);

    const isPaid = paymentStatus === "PAID" || orderStatus === "PAID";
    const isRequested =
      paymentStatus === "REQUESTED" ||
      orderStatus === "PAYMENT_REQUESTED" ||
      orderStatus === "PAYMENT_PENDING";

    // "Pay after acceptance": show waiting state until requested.
    const shouldWaitForPharmacy = !isPaid && !isRequested;

    return { orderStatus, paymentStatus, isPaid, isRequested, shouldWaitForPharmacy };
  }, [order?.status, order?.paymentStatus]);

  const onCancel = useCallback(() => {
    if (!cancelAllowed || !id || !token) return;
    setCancelOpen(true);
  }, [cancelAllowed, id, token]);

  const submitCancel = useCallback(async () => {
    if (!cancelAllowed || !id || !token) return;
    const reason = cancelReason === "Other" ? cancelReasonOther.trim() : cancelReason;
    setCancelBusy(true);
    try {
      await Api.request(`/orders/${id}/cancel`, {
        method: "POST",
        token,
        body: reason ? { reason } : {},
      });
      setCancelOpen(false);
      setCancelReasonOther("");
      setRetryTick((v) => v + 1);
    } catch (e: any) {
      Alert.alert("Cancel failed", e?.message || "Unable to cancel right now");
    } finally {
      setCancelBusy(false);
    }
  }, [cancelAllowed, id, token, cancelReason, cancelReasonOther]);

  const onPayNow = useCallback(async () => {
    if (!token || !id) return;
    setPayBusy(true);
    try {
      // Terms/consent gating (best-effort).
      try {
        const gate = await getLegalGate(token);
        if (gate.required && !gate.accepted) {
          Alert.alert("Please accept Terms", "Before paying, you must accept our Terms & Privacy.", [
            { text: "Not now", style: "cancel" },
            { text: "Review", onPress: () => router.push("/legal") },
          ]);
          return;
        }
      } catch {
        // If legal endpoints are unavailable, do not hard-block payment.
      }

      const intent = await Api.request<any>("/payments/create-intent", {
        method: "POST",
        token,
        body: { orderId: Number(id) },
      });

      const url =
        (intent && (intent.url || intent.paymentUrl || intent.checkoutUrl)) ||
        (intent?.data && (intent.data.url || intent.data.paymentUrl || intent.data.checkoutUrl));

      if (typeof url === "string" && url.startsWith("http")) {
        await Linking.openURL(url);
        return;
      }

      Alert.alert("Payment started", "Complete payment in the payment screen.");
    } catch (e: any) {
      // Dev fallback (if enabled on backend)
      try {
        await Api.request("/payments/dev/pay-order", {
          method: "POST",
          token,
          body: { orderId: Number(id) },
        });
        Alert.alert("Payment complete", "Dev payment captured for this order.");
        setRetryTick((v) => v + 1);
        return;
      } catch {
        Alert.alert("Payment failed", e?.message || "Unable to start payment");
      }
    } finally {
      setPayBusy(false);
    }
  }, [token, id, router]);

  const onConfirmChanges = useCallback(async () => {
    if (!token || !id) return;
    setPayBusy(true);
    try {
      await Api.request(`/orders/${id}/confirm-changes`, { method: "POST", token });
      setRetryTick((v) => v + 1);
    } catch (e: any) {
      Alert.alert("Unable to confirm", e?.message || "Please try again");
    } finally {
      setPayBusy(false);
    }
  }, [token, id]);

  const onRejectChanges = useCallback(async () => {
    if (!token || !id) return;
    Alert.alert("Reject pharmacy changes?", "Your order will be canceled if you reject these changes.", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Reject & cancel",
        style: "destructive",
        onPress: async () => {
          setPayBusy(true);
          try {
            await Api.request(`/orders/${id}/reject-changes`, { method: "POST", token, body: {} });
            setRetryTick((v) => v + 1);
          } catch (e: any) {
            Alert.alert("Unable to reject", e?.message || "Please try again");
          } finally {
            setPayBusy(false);
          }
        },
      },
    ]);
  }, [token, id]);

  const destination = useMemo(() => pickLatLng(tracking?.destination), [tracking?.destination]);
  const riderCoord = useMemo(() => pickLatLng(tracking?.rider), [tracking?.rider]);
  const canUseLiveMap = useMemo(() => isLiveMapAvailable(), []);
  const riderDisplay = useMemo(() => {
    if (!riderCoord) return null;
    const coords = route?.coords;
    if (!coords || coords.length < 2) return riderCoord;
    return snapToRoute(riderCoord, coords);
  }, [riderCoord, route?.coords]);

  // Fetch route polyline + ETA via OSRM (best-effort).
  const routeFrom = useMemo(
    () => (riderCoord ? { latitude: riderCoord.latitude, longitude: riderCoord.longitude } : null),
    [riderCoord]
  );
  const routeTo = useMemo(
    () => (destination ? { latitude: destination.latitude, longitude: destination.longitude } : null),
    [destination]
  );

  useEffect(() => {
    if (!routeTo || !routeFrom) {
      setRoute(null);
      setRouteError(null);
      setRouteLoading(false);
      return;
    }
    if (offline) return;

    const controller = new AbortController();
    setRouteError(null);

    // Avoid spamming OSRM on minor GPS jitter.
    const prev = lastRouteReq.current;
    const now = Date.now();
    if (prev && now - prev.at < 12_000) {
      const moved = distanceMeters(prev.from, routeFrom);
      const destMoved = distanceMeters(prev.to, routeTo);
      if (moved < 30 && destMoved < 5) {
        return () => controller.abort();
      }
    }
    lastRouteReq.current = { at: now, from: routeFrom, to: routeTo };
    setRouteLoading(true);

    (async () => {
      try {
        const r = await getRouteOsrm(routeFrom, routeTo, {
          signal: controller.signal,
          cacheTtlMs: 15_000,
        });
        const eta =
          Number.isFinite(r.durationSeconds) && r.durationSeconds > 0
            ? Math.max(1, Math.round(r.durationSeconds / 60))
            : null;
        const km =
          Number.isFinite(r.distanceMeters) && r.distanceMeters > 0
            ? r.distanceMeters / 1000
            : null;
        setRoute({ coords: r.polyline, etaMinutes: eta, distanceKm: km });
      } catch (e: any) {
        if (String(e?.name) === "AbortError") return;
        setRouteError(e?.message || "Routing failed");
      } finally {
        setRouteLoading(false);
      }
    })();

    return () => controller.abort();
  }, [routeFrom, routeTo, offline]);

  const mapUrl = useMemo(() => {
    if (!destination) return null;

    // Free static map image (no key) from OpenStreetMap staticmap.de.
    // This is a lightweight preview; user can open full maps via "Open in Maps".
    const center = `${destination.latitude},${destination.longitude}`;
    const size = "640x300";
    const zoom = "15";
    const marker = `${destination.latitude},${destination.longitude},lightblue1`;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${size}&maptype=mapnik&markers=${encodeURIComponent(marker)}`;
  }, [destination]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <HeartRateLoader width={260} height={72} color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.xl }}>
        {error === "OFFLINE" ? (
          <NetworkStateCard
            title="Poor connection"
            body="Reconnect and tap retry to refresh your order."
            onRetry={() => setRetryTick((v) => v + 1)}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text variant="body" color={colors.danger}>
              {error || "Order not found"}
            </Text>
          </View>
        )}
      </View>
    );
  }

  const stageIndex = MAIN_EVENTS.findIndex((ev) =>
    mainTimeline.some((t) => String(t.event || "") === ev)
  );

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Order #{order.id}</Text>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Status</Text>
        <Text variant="body">{order.status}</Text>
      </Card>

      {String(order.status || "").toUpperCase().includes("PRESCRIPTION") ||
      Boolean(order.requiresPrescription) ||
      Boolean(order.prescriptionRequired) ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Prescription required</Text>
          <Text variant="caption" color={colors.inkMuted}>
            Upload/attach your prescription to avoid delays.
          </Text>
          <PrimaryButton title="Attach prescription" onPress={() => router.push(`/prescriptions/attach?orderId=${order.id}`)} />
        </Card>
      ) : null}

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Items</Text>
        {Array.isArray(order.items) && order.items.length > 0 ? (
          order.items.map((it: any, idx: number) => (
            <Text key={idx} variant="body">
              {it.name} {"\u00D7"} {it.quantity}
            </Text>
          ))
        ) : (
          <Text variant="body">No items</Text>
        )}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Order progress</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {["Placed", "Accepted", "Prepared", "Picked", "Out", "Delivered"].map((label, idx) => {
            const active = idx <= stageIndex;
            return (
              <View key={label} style={{ alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: active ? colors.primary : colors.primarySoft,
                  }}
                />
                <Text variant="caption" color={active ? colors.ink : colors.inkMuted}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.primarySoft, overflow: "hidden" }}>
          <View
            style={{
              width: `${Math.max(0, stageIndex + 1) * (100 / MAIN_EVENTS.length)}%`,
              height: "100%",
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="subtitle">Tracking</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {trackingLoading ? (
              <View style={{ width: 18, height: 18 }}>
                <HeartRateLoader width={18} height={18} color={colors.primary} />
              </View>
            ) : null}
            <Pressable
              onPress={() => loadTracking()}
              disabled={trackingLoading || offline}
              style={{ opacity: trackingLoading || offline ? 0.5 : 1 }}
            >
              <Text variant="label" color={colors.primary}>
                Refresh
              </Text>
            </Pressable>
          </View>
        </View>

        {offline && !tracking ? (
          <NetworkStateCard
            title="You're offline"
            body="Reconnect to view live tracking."
            onRetry={() => loadTracking()}
          />
        ) : trackingError && !tracking ? (
          <NetworkStateCard
            title={trackingError === "OFFLINE" ? "Poor connection" : "Tracking unavailable"}
            body={trackingError === "OFFLINE" ? "Check your connection and try again." : "Try again in a moment."}
            onRetry={() => loadTracking()}
          />
        ) : route?.etaMinutes != null || route?.distanceKm != null || tracking?.etaMinutes != null || tracking?.distanceKm != null ? (
          <View style={{ gap: 4 }}>
            {route?.etaMinutes != null ? (
              <Text variant="body">ETA: {route.etaMinutes} min</Text>
            ) : tracking?.etaMinutes != null ? (
              <Text variant="body">ETA: {Math.max(0, Math.round(Number(tracking.etaMinutes)))} min</Text>
            ) : null}
            {route?.distanceKm != null ? (
              <Text variant="body">Distance: {Number(route.distanceKm).toFixed(1)} km</Text>
            ) : tracking?.distanceKm != null ? (
              <Text variant="body">Distance: {Number(tracking.distanceKm).toFixed(1)} km</Text>
            ) : null}
            {routeError ? (
              <Text variant="caption" color={colors.inkMuted}>
                Route: {routeError}
              </Text>
            ) : null}
            {tracking?.rider?.name ? (
              <Text variant="caption" color={colors.inkMuted}>
                Rider: {tracking.rider.name}
              </Text>
            ) : null}
            {tracking?.updatedAt ? (
              <Text variant="caption" color={colors.inkMuted}>
                Updated: {new Date(tracking.updatedAt).toLocaleString()}
              </Text>
            ) : null}
            {routeLoading ? (
              <Text variant="caption" color={colors.inkMuted}>
                Updating route...
              </Text>
            ) : null}
            {trackingLoading ? (
              <Text variant="caption" color={colors.inkMuted}>
                Refreshing...
              </Text>
            ) : null}
          </View>
        ) : (
          <Text variant="caption" color={colors.inkMuted}>
            Tracking will appear once a rider is assigned.
          </Text>
        )}
        {destination ? (
          <Pressable
            onPress={() => {
              const q = `${destination.latitude},${destination.longitude}`;
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`).catch(() => {});
            }}
            style={{ alignSelf: "flex-start", marginTop: 4 }}
          >
            <Text variant="label" color={colors.primary}>
              Open in Maps
            </Text>
          </Pressable>
        ) : null}

        {/* Real map when available; falls back to static preview in Expo Go / missing native maps */}
        {destination ? (
          <View style={{ height: 180, borderRadius: 12, overflow: "hidden", backgroundColor: colors.primarySoft }}>
            {canUseLiveMap ? (
              <LiveTrackingMap rider={riderDisplay} destination={destination} route={route?.coords ?? null} />
            ) : mapUrl ? (
              <Image source={{ uri: mapUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text variant="caption" color={colors.inkMuted}>
                  Map preview unavailable.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View
            style={{
              height: 180,
              borderRadius: 12,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="caption" color={colors.inkMuted}>
              Map preview will appear once we have a destination.
            </Text>
          </View>
        )}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Timeline</Text>
        {mainTimeline.length === 0 ? (
          <Text variant="body">No updates yet.</Text>
        ) : (
          mainTimeline.map((t, idx) => (
            <View key={`${t.event}-${idx}`} style={{ gap: 4, paddingVertical: 6 }}>
              <Text variant="label">
                {FRIENDLY_EVENT[String(t.event || "")] || String(t.event || "").replaceAll("_", " ")}
              </Text>
              {pickEventTime(t) ? (
                <Text variant="caption" color={colors.inkMuted}>
                  {fmtDateMaybe(pickEventTime(t)!)}
                </Text>
              ) : null}
              {idx !== mainTimeline.length - 1 ? (
                <View style={{ height: 1, backgroundColor: colors.border, marginTop: 6 }} />
              ) : null}
            </View>
          ))
        )}
      </Card>

      {pricingChange ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Review pharmacy changes</Text>
          <Text variant="caption" color={colors.inkMuted}>
            The pharmacy updated availability and/or prices. Please review and confirm to continue.
            {pricingChange.at ? ` (Updated ${fmtDateMaybe(pricingChange.at)})` : ""}
          </Text>

          {pricingChange.missingItems.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text variant="label">Unavailable items</Text>
              {pricingChange.missingItems.slice(0, 6).map((m: any) => (
                <View key={`miss-${m.orderItemId}`} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="body" style={{ flex: 1 }}>
                    {String(m.name || "Item")}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    x{Number(m.requestedQuantity ?? 0) || 0}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <Text variant="label">Items</Text>
            {pricingChange.pricedItems.slice(0, 10).map((p: any) => (
              <View key={`pi-${p.orderItemId}`} style={{ gap: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={2}>
                    {String(p.name || "Item")}
                  </Text>
                  <Text variant="label">{formatPrice(Number(p.price ?? 0))}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="caption" color={colors.inkMuted}>
                    Qty: {Number(p.quantity ?? 0) || 0}
                    {Number.isFinite(Number(p.requestedQuantity)) && Number(p.requestedQuantity) !== Number(p.quantity)
                      ? ` (requested ${Number(p.requestedQuantity)})`
                      : ""}
                  </Text>
                  {p.source ? (
                    <Text variant="caption" color={colors.inkMuted}>
                      {String(p.source).toUpperCase()}
                    </Text>
                  ) : null}
                </View>
                {p.note ? (
                  <Text variant="caption" color={colors.inkMuted}>
                    Note: {String(p.note)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          {pricingChange.totalPrice != null ? (
            <View style={{ gap: 4, paddingTop: 4 }}>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body" color={colors.inkMuted}>
                  Total
                </Text>
                <Text variant="label">{formatPrice(pricingChange.totalPrice)}</Text>
              </View>
              {pricingChange.couponDiscount != null && pricingChange.couponDiscount > 0 ? (
                <Text variant="caption" color={colors.inkMuted}>
                  Coupon applied: -{formatPrice(pricingChange.couponDiscount)}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <PrimaryButton title="Confirm changes" onPress={onConfirmChanges} loading={payBusy} disabled={offline} />
            <PrimaryButton
              title="Reject changes"
              variant="secondary"
              onPress={onRejectChanges}
              loading={payBusy}
              disabled={offline}
            />
          </View>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">Payment</Text>
        {paymentInfo.isPaid ? (
          <Text variant="body" color={colors.inkMuted}>
            Paid
          </Text>
        ) : paymentInfo.isRequested ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="body" color={colors.inkMuted}>
              Payment is requested after the pharmacy checks availability.
            </Text>
            {typeof order?.totalPrice === "number" ? (
              <Text variant="label">Total: {formatPrice(order.totalPrice)}</Text>
            ) : typeof order?.total === "number" ? (
              <Text variant="label">Total: {formatPrice(order.total)}</Text>
            ) : null}
            {order?.couponCode ? (
              <Text variant="caption" color={colors.inkMuted}>
                Coupon: {String(order.couponCode)}
                {order?.couponDiscount ? ` (-${formatPrice(Number(order.couponDiscount))})` : ""}
              </Text>
            ) : null}
            <PrimaryButton title="Pay now" onPress={onPayNow} loading={payBusy} disabled={offline} />
            <PrimaryButton
              title="View receipt"
              variant="secondary"
              onPress={() => router.push(`/receipt?orderId=${encodeURIComponent(String(id))}`)}
              disabled={offline}
            />
            <PrimaryButton
              title="Reorder"
              variant="secondary"
              onPress={() => router.push(`/reorder?orderId=${encodeURIComponent(String(id))}`)}
              disabled={offline}
            />
          </View>
        ) : normalizeStatus(order?.status) === "NEEDS_CONFIRMATION" ? (
          <Text variant="body" color={colors.inkMuted}>
            Waiting for you to confirm pharmacy changes before payment can be requested.
          </Text>
        ) : (
          <Text variant="body" color={colors.inkMuted}>
            {"Waiting for pharmacy confirmation. You'll be asked to pay once they accept and confirm items."}
          </Text>
        )}
      </Card>

      {cancelAllowed ? (
        <PrimaryButton
          title="Cancel order"
          variant="secondary"
          onPress={onCancel}
          loading={cancelBusy}
          disabled={offline}
        />
      ) : null}

      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            padding: spacing.lg,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
              gap: spacing.md,
            }}
          >
            <Text variant="subtitle">Cancel order</Text>
            <Text variant="caption" color={colors.inkMuted}>
              Tell us why you're cancelling (helps us improve). Cancellation may be denied if preparation has started.
            </Text>

            <View style={{ gap: 8 }}>
              {(
                [
                  "Changed my mind",
                  "Found cheaper elsewhere",
                  "Ordered by mistake",
                  "Delivery too slow",
                  "Other",
                ] as const
              ).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setCancelReason(r)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 2,
                      borderColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cancelReason === r ? (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: colors.primary,
                        }}
                      />
                    ) : null}
                  </View>
                  <Text variant="body">{r}</Text>
                </Pressable>
              ))}
            </View>

            {cancelReason === "Other" ? (
              <View style={{ gap: 8 }}>
                <Text variant="caption" color={colors.inkMuted}>
                  Reason
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <TextInput
                    placeholder="Type your reason"
                    value={cancelReasonOther}
                    onChangeText={setCancelReasonOther}
                    style={{ fontSize: 14, color: colors.ink }}
                    placeholderTextColor={colors.inkMuted}
                    multiline
                  />
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Keep order" variant="secondary" onPress={() => setCancelOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Cancel" onPress={submitCancel} loading={cancelBusy} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScroll>
  );
}

