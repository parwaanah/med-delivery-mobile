import { useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Text, Card, colors, spacing, radii, ScreenScroll, Input } from "@mobile/ui";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CATEGORIES } from "../constants/categories";

type CategoryItem = {
  label: string;
  q: string;
  icon: { pack: "mci" | "ion"; name: string };
};

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(0,0,0,${alpha})`;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function CategoriesScreen() {
  const router = useRouter();

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:3001";
  const [cfg, setCfg] = useState<Array<{ key?: string; label?: string; icon?: any; enabled?: boolean }> | null>(null);
  const [query, setQuery] = useState("");
  const [sortAz, setSortAz] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/config/mobile-categories`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data?.categories) ? data.categories : null;
        setCfg(items && items.length ? items : null);
      })
      .catch(() => {
        if (active) setCfg(null);
      });
    return () => {
      active = false;
    };
  }, [API_BASE]);

  const categories = useMemo<CategoryItem[]>(() => {
    const iconFor = (raw: any): CategoryItem["icon"] => {
      const icon = raw?.icon;
      if (icon && typeof icon === "object") {
        const pack = String((icon as any).pack || "").trim().toLowerCase();
        const name = String((icon as any).name || "").trim();
        if ((pack === "ion" || pack === "mci") && name) return { pack: pack as any, name };
      }

      const label = String(raw?.label || "").trim().toLowerCase();
      const key = String(raw?.key || "").trim().toLowerCase();
      const match = CATEGORIES.find(
        (c) => c.label.toLowerCase() === label || c.q.toLowerCase() === key || c.q.toLowerCase().includes(key)
      );
      return match?.icon ?? { pack: "ion", name: "apps" };
    };

    if (cfg && cfg.length) {
      return cfg
        .filter((c: any) => c && typeof c === "object" && c.enabled !== false)
        .map((c: any) => ({
          label: String(c.label || "").trim(),
          q: String(c.key || "").trim(),
          icon: iconFor(c),
        }))
        .filter((c: CategoryItem) => Boolean(c.label) && Boolean(c.q));
    }

    return CATEGORIES.map((c) => ({
      label: c.label,
      q: c.q,
      icon: c.icon,
    }));
  }, [cfg]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? categories.filter((c) => c.label.toLowerCase().includes(q) || c.q.toLowerCase().includes(q))
      : categories;
    if (!sortAz) return list;
    return [...list].sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, query, sortAz]);

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="titleLarge">Categories</Text>
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

      <Input
        placeholder="Search categories…"
        value={query}
        onChangeText={setQuery}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="caption" color={colors.inkMuted}>
          {filtered.length} categories
        </Text>
        <Pressable
          onPress={() => setSortAz((v) => !v)}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: sortAz ? "#E9F7F1" : "#fff",
          }}
        >
          <Text variant="caption" color={sortAz ? colors.primary : colors.inkMuted}>
            A–Z
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        {filtered.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => router.push(`/search?q=${encodeURIComponent(c.q)}`)}
            style={{ width: "48%" }}
          >
            <Card
              style={{
                padding: spacing.lg,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.border,
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: hexToRgba(colors.primary, 0.08),
                  borderWidth: 2,
                  borderColor: hexToRgba(colors.primary, 0.22),
                }}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    width: 74,
                    height: 74,
                    borderRadius: 999,
                    backgroundColor: hexToRgba(colors.primary, 0.16),
                    transform: [{ scale: 1.12 }],
                    opacity: 0.55,
                  }}
                />
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    ...(Platform.OS === "ios"
                      ? {
                          shadowColor: colors.primary,
                          shadowOpacity: 0.22,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 6 },
                        }
                      : {}),
                  }}
                >
                  {c.icon.pack === "ion" ? (
                    <Ionicons name={c.icon.name as any} size={30} color={colors.primary} />
                  ) : (
                    <MaterialCommunityIcons name={c.icon.name as any} size={30} color={colors.primary} />
                  )}
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text variant="subtitle" style={{ lineHeight: 24 }}>
                  {c.label}
                </Text>
                <Text variant="caption" color={colors.inkMuted}>
                  Explore {c.label.toLowerCase()}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScreenScroll>
  );
}
