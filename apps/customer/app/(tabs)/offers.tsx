import { useState } from "react";
import { View, Pressable } from "react-native";
import { Text, Card, PrimaryButton, colors, spacing, radii, ScreenScroll } from "@mobile/ui";

const tabs = ["All", "Payment", "Medicine", "Diagnostic"];

const offers = [
  {
    title: "Flat 50% off upto $50",
    subtitle: "Superplus Cashback",
    detail: "Only on Healthcare Products on Orders above $100",
    code: "BCH12",
    badge: "50%",
    accent: "#CEC3FF",
  },
  {
    title: "Flat 30% off upto $450",
    subtitle: "Cashback",
    detail: "Big Bachat only on Tuesdays",
    code: "BCH12",
    badge: "30%",
    accent: "#FFBCD4",
  },
  {
    title: "Mega Sale Flat 60% Off",
    subtitle: "Diabetic Care",
    detail: "On Purchase of Diabetic Cardic Products",
    code: "BCH12",
    badge: "60%",
    accent: "#FFD68A",
  },
];

export default function OffersScreen() {
  const [active, setActive] = useState(0);

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge" color={colors.inkStrong}>
        OFFERS
      </Text>

      <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
        {tabs.map((tab, index) => (
          <Pressable
            key={tab}
            onPress={() => setActive(index)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: index === active ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: index === active ? colors.primary : colors.border,
            }}
          >
            <Text variant="label" color={index === active ? "#fff" : colors.ink}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        {offers.map((offer) => (
          <Card key={offer.title} style={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radii.card,
                  backgroundColor: offer.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="titleLarge">{offer.badge}</Text>
                <Text variant="label">OFF</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
            <Text variant="subtitle" color={colors.inkStrong}>
              {offer.title}
            </Text>
            <Text variant="body" color={colors.inkMuted}>
              {offer.subtitle}
            </Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {offer.detail}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text variant="label">CODE: {offer.code}</Text>
              <PrimaryButton title="COPY CODE" variant="ghost" />
            </View>
          </Card>
        ))}
      </View>
    </ScreenScroll>
  );
}


