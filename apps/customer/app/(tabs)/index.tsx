import { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, ImageBackground, useWindowDimensions, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Text, Input, Card, colors, spacing, radii, ScreenScroll } from "@mobile/ui";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Api } from "@mobile/api";
import { track } from "@/lib/analytics";
import { addRecentSearch, getRecentSearches } from "@/lib/recentSearches";
import { CATEGORIES } from "../../constants/categories";
const bannerBg = require("../../assets/splash/splash-pattern.png");
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:3001";

type CategoryItem = {
  label: string;
  q: string;
  icon: { pack: "mci" | "ion"; name: string };
};

function hexToRgba(hex: string, alpha: number) {
  // Accepts "#RRGGBB" (fallbacks to black if unknown).
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(0,0,0,${alpha})`;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: number; name: string; price?: number; category?: string }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [categoriesCfg, setCategoriesCfg] = useState<CategoryItem[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/config/hero-banner`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const url = typeof data?.url === "string" && data.url.length > 0 ? data.url : null;
        setHeroUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/config/mobile-categories`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data?.categories) ? data.categories : null;
        if (!items || items.length === 0) {
          setCategoriesCfg(null);
          return;
        }

        const iconFor = (raw: any): CategoryItem["icon"] => {
          // Prefer backend-provided icon (when configured via admin).
          const icon = raw?.icon;
          if (icon && typeof icon === "object") {
            const pack = String((icon as any).pack || "").trim().toLowerCase();
            const name = String((icon as any).name || "").trim();
            if ((pack === "ion" || pack === "mci") && name) return { pack: pack as any, name };
          }

          // Fallback to local mapping.
          const label = String(raw?.label || "").trim().toLowerCase();
          const key = String(raw?.key || "").trim().toLowerCase();
          const match = CATEGORIES.find(
            (c) => c.label.toLowerCase() === label || c.q.toLowerCase() === key || c.q.toLowerCase().includes(key)
          );
          return match?.icon ?? { pack: "ion", name: "apps" };
        };

        const mapped: CategoryItem[] = items
          .filter((c: any) => c && typeof c === "object" && c.enabled !== false)
          .map((c: any) => ({
            label: String(c.label || "").trim(),
            q: String(c.key || "").trim(),
            icon: iconFor(c),
          }))
          .filter((c: CategoryItem) => Boolean(c.label) && Boolean(c.q));

        setCategoriesCfg(mapped.length ? mapped : null);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

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
  }, []);

  const features = useMemo(
    () => [
      {
        title: "Upload",
        subtitle: "Prescription",
        body: "Snap or upload and we handle the rest.",
        icon: "document-text",
      },
      {
        title: "Track",
        subtitle: "Your Order",
        body: "See live updates on your delivery.",
        icon: "navigate",
      },
      {
        title: "Refill",
        subtitle: "Medicine",
        body: "Repeat orders in a tap.",
        icon: "refresh",
      },
      {
        title: "Find",
        subtitle: "Nearby Pharmacies",
        body: "Trusted partners around you.",
        icon: "medkit",
      },
    ],
    []
  );

  const categories = useMemo<CategoryItem[]>(() => categoriesCfg || CATEGORIES, [categoriesCfg]);

  useEffect(() => {
    if (!focused || query.trim().length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
      return;
    }

    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    setSuggestLoading(true);
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await Api.request<{ items: any[] }>(`/medicines/search?q=${encodeURIComponent(query.trim())}`);
        const items = Array.isArray(res?.items) ? res.items : [];
        setSuggestions(items.slice(0, 6));
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 280);

    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [focused, query]);

  const goSearch = async (q: string) => {
    const v = q.trim();
    if (!v) return;
    track("search", { q: v }).catch(() => {});
    await addRecentSearch(v);
    setRecent((prev) => [v, ...prev.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 12));
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const itemGap = spacing.md;
  const trackPad = spacing.xl;
  const carouselViewportW = Math.max(280, screenW - trackPad * 2);
  // Fit ~3.35 cards (3 full + 4th peeking). Account for gaps between cards.
  const itemW = Math.round((carouselViewportW - itemGap * 2) / 3.25);
  const snap = itemW + itemGap;

  return (
    <ScreenScroll padded={false} contentStyle={{ gap: spacing.xl }}>
      <ImageBackground
        source={heroUrl ? { uri: heroUrl } : bannerBg}
        style={{
          marginTop: -insets.top,
          paddingTop: insets.top + spacing.xl * 1.2,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xl,
          gap: spacing.md,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: "hidden",
        }}
        imageStyle={{ resizeMode: "cover" }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={() => router.push("/categories" as any)}>
            <Ionicons name="grid" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={() => router.push("/addresses")} style={{ alignItems: "center", gap: 4 }}>
            <Text variant="caption" color="rgba(255,255,255,0.9)">
              Current location
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="location" size={14} color="#fff" />
              <Text variant="label" color="#fff">
                Pontianak
              </Text>
              <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.9)" />
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push("/profile")}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="person" size={16} color="#fff" />
          </Pressable>
        </View>

        <Text variant="titleLarge" color="#fff">
          Search Medicines
        </Text>
        <Text variant="caption" color="rgba(255,255,255,0.9)">
          Find medicines, labs, and health products
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            paddingHorizontal: 8,
            paddingVertical: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="search" size={16} color={colors.inkMuted} />
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Input
              placeholder="Search medicines"
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                borderWidth: 0,
                paddingVertical: 8,
                height: 36,
              }}
              onSubmitEditing={() => goSearch(query)}
            />
          </View>
          <Pressable
            onPress={() => goSearch(query)}
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 18,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 76,
            }}
          >
            <Text variant="label" color={colors.inkStrong}>
              Search
            </Text>
          </Pressable>
        </View>

        {focused ? (
          <View style={{ marginTop: 10 }}>
            <Card style={{ padding: spacing.md, gap: spacing.sm }}>
              {query.trim().length < 2 ? (
                <>
                  <Text variant="label" color={colors.inkMuted}>
                    Recent searches
                  </Text>
                  {recent.slice(0, 6).length === 0 ? (
                    <Text variant="caption" color={colors.inkMuted}>
                      Start typing to search.
                    </Text>
                  ) : (
                    recent.slice(0, 6).map((r) => (
                      <Pressable key={r} onPress={() => goSearch(r)}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                          <Ionicons name="time-outline" size={16} color={colors.inkMuted} />
                          <Text variant="body" style={{ flex: 1 }}>
                            {r}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  )}
                </>
              ) : suggestLoading ? (
                <Text variant="caption" color={colors.inkMuted}>
                  Searching...
                </Text>
              ) : suggestions.length === 0 ? (
                <Text variant="caption" color={colors.inkMuted}>
                  No suggestions.
                </Text>
              ) : (
                <>
                  <Text variant="label" color={colors.inkMuted}>
                    Suggestions
                  </Text>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        const label = String(s.name || query);
                        addRecentSearch(label).catch(() => {});
                        setRecent((prev) => [label, ...prev.filter((x) => x.toLowerCase() !== label.toLowerCase())].slice(0, 12));
                        setFocused(false);
                        router.push(`/medicine/${s.id}`);
                      }}
                      style={{ paddingVertical: 6 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            backgroundColor: colors.primarySoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="medkit" size={14} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="body" numberOfLines={1}>
                            {s.name}
                          </Text>
                          <Text variant="caption" color={colors.inkMuted}>
                            {s.category || "NON_RX"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
                      </View>
                    </Pressable>
                  ))}
                  <PrimaryLink onPress={() => goSearch(query)} label="See all results" />
                </>
              )}
            </Card>
          </View>
        ) : null}

        <View style={{ height: 170 }} />
      </ImageBackground>

      <View
        style={{
          gap: spacing.sm,
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          width: "100%",
        }}
      >
        <Text
          variant="subtitle"
          numberOfLines={1}
          style={{ textAlign: "center", alignSelf: "stretch", fontSize: 18, lineHeight: 24 }}
        >
          Your Health, Your Way
        </Text>
        <Text variant="caption" color={colors.inkMuted}>
          Top services in one tap
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.xl }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snap}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingVertical: 6,
            paddingLeft: 0,
            paddingRight: trackPad, // breathing room at end
          }}
        >
          {categories.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(`/search?q=${encodeURIComponent(item.q)}`)}
              style={{
                width: itemW,
                marginRight: itemGap,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  backgroundColor: hexToRgba(colors.primary, 0.08),
                  borderWidth: 2,
                  borderColor: hexToRgba(colors.primary, 0.22),
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "visible",
                }}
              >
                 {/* Teal "shadow" / glow that stays circular (also works on Android). */}
                 <View
                   pointerEvents="none"
                   style={{
                     position: "absolute",
                     width: 96,
                     height: 96,
                     borderRadius: 999,
                     backgroundColor: hexToRgba(colors.primary, 0.16),
                     transform: [{ scale: 1.14 }],
                     opacity: 0.38,
                   }}
                 />

                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                     ...(Platform.OS === "android"
                       ? {}
                       : {
                           shadowColor: colors.primary,
                           shadowOpacity: 0.14,
                           shadowRadius: 9,
                           shadowOffset: { width: 0, height: 6 },
                         }),
                   }}
                 >
                  {/* 3D icon only: soft back-layer offset + main icon */}
                  <View style={{ position: "relative" }}>
                    <View style={{ position: "absolute", left: 1.5, top: 2 }}>
                      {item.icon.pack === "mci" ? (
                        <MaterialCommunityIcons
                          name={item.icon.name as any}
                          size={38}
                          color={hexToRgba(colors.primary, 0.35)}
                        />
                      ) : (
                        <Ionicons
                          name={item.icon.name as any}
                          size={38}
                          color={hexToRgba(colors.primary, 0.35)}
                        />
                      )}
                    </View>
                    {item.icon.pack === "mci" ? (
                      <MaterialCommunityIcons name={item.icon.name as any} size={38} color={colors.primary} />
                    ) : (
                      <Ionicons name={item.icon.name as any} size={38} color={colors.primary} />
                    )}
                  </View>
                </View>
              </View>

              <Text
                variant="caption"
                color={colors.inkMuted}
                style={{ textAlign: "center", marginTop: 10 }}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingHorizontal: spacing.xl }}>
        {features.map((item) => (
          <Card
            key={item.title}
            style={{
              width: "48%",
              padding: spacing.md,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: colors.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <Text variant="label">{item.title}</Text>
            <Text variant="body" color={colors.inkStrong}>
              {item.subtitle}
            </Text>
            <Text variant="caption" color={colors.inkMuted}>
              {item.body}
            </Text>
          </Card>
        ))}
      </View>
    </ScreenScroll>
  );
}

function PrimaryLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingTop: 6 }}>
      <Text variant="label" color={colors.primary}>
        {label}
      </Text>
    </Pressable>
  );
}
