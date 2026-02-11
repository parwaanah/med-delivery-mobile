import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Input, Text, Card, PrimaryButton, colors, spacing, useToast, Screen, Skeleton } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { formatPrice } from "@mobile/utils";
import NetInfo from "@react-native-community/netinfo";
import { NetworkStateCard } from "../components/NetworkStateCard";
import { addRecentSearch, clearRecentSearches, getRecentSearches } from "../lib/recentSearches";
import { track } from "@/lib/analytics";
import { WikimediaThumb } from "../components/WikimediaThumb";

type Medicine = {
  id: number;
  name: string;
  price?: number;
  category?: string;
  imageUrl?: string;
};

const SkeletonRow = () => (
  <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: spacing.sm }}>
    <Skeleton width={44} height={44} radius={12} />
    <View style={{ flex: 1, gap: 6 }}>
      <Skeleton width="70%" height={14} radius={8} />
      <Skeleton width="40%" height={12} radius={8} />
    </View>
    <View style={{ alignItems: "flex-end", gap: 8 }}>
      <Skeleton width={50} height={12} radius={8} />
      <Skeleton width={64} height={28} radius={10} />
    </View>
  </View>
);

const ResultRow = memo(
  ({
    item,
    onPress,
    onAdd,
  }: {
    item: Medicine;
    onPress: (id: number) => void;
    onAdd: (id: number) => void;
  }) => (
    <Pressable
      onPress={() => onPress(item.id)}
      style={{
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <WikimediaThumb
            query={item.name}
            size={44}
            radius={12}
            uri={item.imageUrl || null}
            fallbackIcon="medkit-outline"
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="body">{item.name}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {item.category || "NON_RX"}
          </Text>
          <Text variant="caption" color={colors.primary}>
            27% OFF
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text variant="body">{formatPrice(Number(item.price || 0))}</Text>
          <PrimaryButton title="Add" onPress={() => onAdd(item.id)} />
        </View>
      </View>
    </Pressable>
  )
);
ResultRow.displayName = "ResultRow";

export default function SearchScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(String(q || ""));
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToast();

  const onOpenMedicine = useCallback(
    (id: number) => {
      router.push(`/medicine/${id}`);
    },
    [router]
  );

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const down = state.isConnected === false || state.isInternetReachable === false;
      setOffline(Boolean(down));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!query.trim()) {
        setItems([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await Api.request<{ items: Medicine[] }>(
          `/medicines/search?q=${encodeURIComponent(query.trim())}`
        );
        const next = res.items || [];
        setItems(next);
        if (query.trim().length >= 2 && next.length > 0) {
          await addRecentSearch(query.trim());
          setRecent((prev) => [query.trim(), ...prev.filter((x) => x.toLowerCase() !== query.trim().toLowerCase())].slice(0, 12));
        }
      } catch (e: any) {
        const msg = e?.message || "Failed to load results";
        if (offline || /network request failed/i.test(String(msg))) {
          setError("OFFLINE");
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(run, 350);
    return () => clearTimeout(t);
  }, [query, retryTick, offline]);

  useEffect(() => {
    let active = true;
    getRecentSearches()
      .then((r) => {
        if (active) setRecent(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [retryTick]);

  const onAdd = useCallback(async (medicineId: number) => {
    if (!user || !token) {
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
        body: { medicineId, quantity: 1 },
      });
      toast.show("Added to cart");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      track("add_to_cart", { medicineId, qty: 1 }, token).catch(() => {});
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
  }, [logout, router, toast, token, user]);

  const chips = useMemo(
    () =>
      query.trim()
        ? [
            { label: query.trim(), type: "Brand" },
            { label: `${query.trim()} 250mg`, type: "Medicine" },
            { label: `${query.trim()} 500mg`, type: "Medicine" },
            { label: `${query.trim()} pain relief`, type: "Use" },
          ]
        : [],
    [query]
  );

  return (
    <Screen padded={false}>
      <FlashList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ResultRow item={item} onPress={onOpenMedicine} onAdd={onAdd} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: spacing.xl }}>
              <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
                {new Array(6).fill(0).map((_, i) => (
                  <View key={`sk-${i}`}>
                    <SkeletonRow />
                  </View>
                ))}
              </Card>
            </View>
          ) : null
        }
        ListFooterComponent={
          error === "OFFLINE" && items.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}>
              <NetworkStateCard
                title="Poor connection"
                body="We’re showing your last results. Reconnect and retry."
                onRetry={() => setRetryTick((v) => v + 1)}
              />
            </View>
          ) : loading && items.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.xl }}>
              <Card style={{ padding: spacing.lg, gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="time-outline" size={16} color={colors.inkMuted} />
                  <Text variant="caption" color={colors.inkMuted}>
                    Searching…
                  </Text>
                </View>
                <SkeletonRow />
                <SkeletonRow />
              </Card>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
            <Text variant="titleLarge">Search</Text>
            <Card style={{ padding: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="search" size={18} color={colors.inkMuted} />
                <Input
                  placeholder="Search medicines"
                  value={query}
                  onChangeText={setQuery}
                  style={{ borderWidth: 0, paddingVertical: 6, flex: 1 }}
                  autoFocus
                />
              </View>
            </Card>

            {!query.trim() ? (
              <Card style={{ padding: spacing.lg, gap: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text variant="subtitle">Recent</Text>
                  <Pressable
                    onPress={async () => {
                      await clearRecentSearches();
                      setRecent([]);
                    }}
                  >
                    <Text variant="label" color={colors.primary}>
                      Clear
                    </Text>
                  </Pressable>
                </View>

                {recent.length === 0 ? (
                  <Text variant="caption" color={colors.inkMuted}>
                    No recent searches.
                  </Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {recent.slice(0, 10).map((r) => (
                        <Pressable
                          key={r}
                          onPress={() => setQuery(r)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: colors.primarySoft,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text variant="caption" color={colors.ink}>
                            {r}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                )}
              </Card>
            ) : null}

            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="search" size={16} color={colors.inkMuted} />
                <Text variant="body" color={colors.inkMuted}>
                  {query.trim() ? `Search for "${query.trim()}"` : "Search results"}
                </Text>
              </View>

              {chips.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {chips.map((chip) => (
                    <Pressable
                      key={`${chip.label}-${chip.type}`}
                      onPress={() => setQuery(chip.label)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: colors.primarySoft,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text variant="caption" color={colors.ink}>
                        {chip.label}{" "}
                        <Text variant="caption" color={colors.inkMuted}>
                          {chip.type}
                        </Text>
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {error === "OFFLINE" ? (
                <NetworkStateCard
                  title="No internet connection"
                  body="Check your connection and try again."
                  onRetry={() => setRetryTick((v) => v + 1)}
                />
              ) : error ? (
                <Text variant="body" color={colors.danger}>
                  {error}
                </Text>
              ) : !loading && items.length === 0 ? (
                <Text variant="body">No results yet.</Text>
              ) : null}
            </Card>
          </View>
        }
        contentContainerStyle={{
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl * 6,
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

