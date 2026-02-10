import { useMemo, useRef, useState } from "react";
import { View, Pressable, ScrollView, useWindowDimensions, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { Text, colors, spacing, Screen, PrimaryButton } from "@mobile/ui";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const splashBg = require("../../assets/splash/splash-pattern.png");

type Slide = {
  title: string;
  body: string;
  icon: any;
};

export default function OnboardingCarousel() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slides = useMemo<Slide[]>(
    () => [
      {
        title: "Medicines in minutes",
        body: "Search, compare, and order essentials from trusted pharmacies.",
        icon: "bag-add-outline",
      },
      {
        title: "Rx made simple",
        body: "Upload your prescription once. We keep it secure and private.",
        icon: "document-text-outline",
      },
      {
        title: "Track every step",
        body: "Real-time updates from confirmation to doorstep delivery.",
        icon: "navigate-outline",
      },
    ],
    []
  );

  const onNext = () => {
    const next = Math.min(slides.length - 1, index + 1);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
    if (next === slides.length - 1 && index === slides.length - 1) {
      router.replace("/(onboarding)/permissions");
    }
  };

  return (
    <Screen padded={false} style={{ backgroundColor: colors.primary }}>
      <ImageBackground source={splashBg} style={{ flex: 1 }} imageStyle={{ opacity: 0.42, resizeMode: "cover" }}>
        <LinearGradient
          colors={["#0f9aa6", colors.primary, "#0b6f64"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ flex: 1 }}
        >
        <View style={{ flex: 1 }}>
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text variant="label" color="rgba(255,255,255,0.9)">
            {index + 1}/{slides.length}
          </Text>
          <Pressable onPress={() => router.replace("/(onboarding)/permissions")}>
            <Text variant="label" color="#fff">
              Skip
            </Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            setIndex(Math.round(x / width));
          }}
          style={{ flex: 1 }}
        >
          {slides.map((s) => (
            <View
              key={s.title}
              style={{
                width,
                paddingHorizontal: spacing.xl,
                justifyContent: "center",
                gap: spacing.lg,
              }}
            >
              <View style={{ alignItems: "flex-start", gap: spacing.lg }}>
                <View
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 28,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <Ionicons name={s.icon} size={34} color="#fff" />
                </View>

                <View style={{ gap: 10 }}>
                  <Text variant="titleLarge" style={{ color: "#fff" }}>
                  {s.title}
                  </Text>
                  <Text variant="body" color="rgba(255,255,255,0.85)" style={{ maxWidth: 340 }}>
                  {s.body}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.28)",
                }}
              />
            ))}
          </View>

          <PrimaryButton
            title={index === slides.length - 1 ? "Continue" : "Next"}
            onPress={onNext}
          />
        </View>
      </View>
      </LinearGradient>
      </ImageBackground>
    </Screen>
  );
}
