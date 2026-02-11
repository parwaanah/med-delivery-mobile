import { useCallback, useEffect, useState } from "react";
import { View, Image, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Card, PrimaryButton, colors, spacing, useToast, Screen, Skeleton } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { formatPrice } from "@mobile/utils";
import * as Haptics from "expo-haptics";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../../components/NetworkStateCard";
import { Ionicons } from "@expo/vector-icons";
import { track } from "@/lib/analytics";
import { WikimediaThumb } from "../../components/WikimediaThumb";

type Medicine = {
  id: number;
  name: string;
  price?: number;
  category?: string;
  manufacturer?: string;
  salt?: string;
  imageUrl?: string;
};

type Substitute = {
  id: number;
  name: string;
  price?: number;
  category?: string;
  imageUrl?: string;
};

export default function MedicineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [subs, setSubs] = useState<Substitute[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToast();
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await Api.request<Medicine>(`/medicines/${id}`);
        setMedicine(res);
        track("view_item", { medicineId: res?.id, name: res?.name }).catch(() => {});
      } catch (e: any) {
        const msg = e?.message || "Failed to load medicine";
        if (offline || /network request failed/i.test(String(msg))) setError("OFFLINE");
        else setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id, offline, retryTick]);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setSubsLoading(true);
      setSubsError(null);
      try {
        const res = await Api.request<Substitute[]>(`/medicines/${id}/substitutes`);
        setSubs(Array.isArray(res) ? res : []);
      } catch (e: any) {
        const msg = e?.message || "Failed to load substitutes";
        setSubsError(offline || /network request failed/i.test(String(msg)) ? "OFFLINE" : msg);
      } finally {
        setSubsLoading(false);
      }
    };
    run();
  }, [id, offline]);

  const onAdd = useCallback(async () => {
    if (!user || !token || !medicine) {
      router.push("/(auth)/phone");
      return;
    }
    if (String(user.role || "").toUpperCase() !== "CUSTOMER") {
      toast.show("Cart is only available for customer accounts.");
      return;
    }
    try {
      await Api.request("/cart/add", {
        method: "POST",
        token,
        body: { medicineId: medicine.id, quantity: 1 },
      });
      toast.show("Added to cart");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      track("add_to_cart", { medicineId: medicine.id, qty: 1 }, token).catch(() => {});
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      if (e?.status === 403) {
        toast.show("Cart is only available for customer accounts.");
        return;
      }
      toast.show(e?.message || "Failed to add to cart");
    }
  }, [logout, medicine, router, toast, token, user]);

  const onOpenSub = useCallback(
    (subId: number) => {
      router.push(`/medicine/${subId}`);
    },
    [router]
  );

  const onRetrySubs = useCallback(() => {
    setRetryTick((v) => v + 1);
  }, []);

  if (loading) {
    return (
      <Screen>
        <View style={{ gap: spacing.lg }}>
          <Skeleton width="80%" height={28} radius={10} />
          <Card style={{ gap: spacing.sm }}>
            <Skeleton width="100%" height={180} radius={12} />
            <Skeleton width={120} height={20} radius={10} />
            <Skeleton width={80} height={14} radius={8} />
            <Skeleton width="60%" height={14} radius={8} />
            <Skeleton width="45%" height={14} radius={8} />
          </Card>
          <Skeleton width="100%" height={48} radius={12} />
        </View>
      </Screen>
    );
  }

  if (error || !medicine) {
    return (
      <Screen>
        {error === "OFFLINE" ? (
          <NetworkStateCard
            title="No internet connection"
            body="Reconnect and try again."
            onRetry={() => setRetryTick((v) => v + 1)}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text variant="body" color={colors.danger}>
              {error || "Medicine not found"}
            </Text>
          </View>
        )}
      </Screen>
    );
  }

  const category = String(medicine.category || "NON_RX");
  const isRx =
    /rx/i.test(category) && !/non[_ -]?rx/i.test(category);

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <Text variant="titleLarge">{medicine.name}</Text>

        <Card style={{ gap: spacing.md }}>
          <View
            style={{
              width: "100%",
              height: 190,
              borderRadius: 16,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {medicine.imageUrl && imageOk ? (
              <Image
                source={{ uri: medicine.imageUrl }}
                style={{ width: "100%", height: 190 }}
                resizeMode="cover"
                onError={() => setImageOk(false)}
              />
            ) : (
              <WikimediaThumb query={medicine.name} size={190} radius={16} uri={null} fallbackIcon="medkit-outline" />
            )}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="subtitle">{formatPrice(Number(medicine.price || 0))}</Text>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: isRx ? "rgba(229,57,53,0.12)" : colors.primarySoft,
                borderWidth: 1,
                borderColor: isRx ? "rgba(229,57,53,0.18)" : colors.border,
              }}
            >
              <Text variant="label" color={isRx ? colors.danger : colors.primary}>
                {isRx ? "Rx" : "OTC"}
              </Text>
            </View>
          </View>

          <Text variant="caption" color={colors.inkMuted}>
            Category: {category}
          </Text>

          {isRx ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text variant="caption" color={colors.danger}>
                Prescription may be required at checkout.
              </Text>
            </View>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Details</Text>
          {medicine.manufacturer ? <Text variant="body">Manufacturer: {medicine.manufacturer}</Text> : null}
          {medicine.salt ? <Text variant="body">Salt: {medicine.salt}</Text> : null}
          {!medicine.manufacturer && !medicine.salt ? (
            <Text variant="caption" color={colors.inkMuted}>
              No additional details available.
            </Text>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Substitutes</Text>
          {subsLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton width="100%" height={18} radius={8} />
              <Skeleton width="90%" height={18} radius={8} />
              <Skeleton width="80%" height={18} radius={8} />
            </View>
          ) : subsError === "OFFLINE" ? (
            <NetworkStateCard
              title="Poor connection"
              body="Reconnect to load substitutes."
              onRetry={onRetrySubs}
            />
          ) : subsError ? (
            <Text variant="caption" color={colors.inkMuted}>
              {subsError}
            </Text>
          ) : subs.length === 0 ? (
            <Text variant="caption" color={colors.inkMuted}>
              No substitutes found.
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {subs.slice(0, 6).map((s) => (
                <Pressable key={s.id} onPress={() => onOpenSub(s.id)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <WikimediaThumb query={s.name} size={42} radius={12} uri={s.imageUrl || null} fallbackIcon="medkit-outline" />
                    <View style={{ flex: 1 }}>
                      <Text variant="label">{s.name}</Text>
                      <Text variant="caption" color={colors.inkMuted}>
                        {formatPrice(Number(s.price || 0))}
                      </Text>
                    </View>
                    <Text variant="label" color={colors.primary}>
                      View
                    </Text>
                  </View>
                </Pressable>
              ))}
              {subs.length > 6 ? (
                <Text variant="caption" color={colors.inkMuted}>
                  +{subs.length - 6} more
                </Text>
              ) : null}
            </View>
          )}
        </Card>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Add to cart" onPress={onAdd} />
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={{
              paddingHorizontal: 14,
              height: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="cart-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

