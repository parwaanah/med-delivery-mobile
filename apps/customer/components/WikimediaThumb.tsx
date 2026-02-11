import { memo } from "react";
import { Image, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Api } from "@mobile/api";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@mobile/ui";

type Props = {
  query: string;
  size: number;
  uri?: string | null;
  radius?: number;
  fallbackIcon?: any;
};

type WikimediaRes = {
  ok: boolean;
  imageUrl: string | null;
};

export const WikimediaThumb = memo(function WikimediaThumb({
  query,
  size,
  uri,
  radius = 12,
  fallbackIcon = "image-outline",
}: Props) {
  const enabled = !uri && Boolean(query && query.trim().length >= 2);

  const q = useQuery({
    queryKey: ["wikimedia", "image", query.trim().toLowerCase(), size],
    queryFn: async () => {
      const params = new URLSearchParams({ query: query.trim(), size: String(size) }).toString();
      return Api.request<WikimediaRes>(`/images/wikimedia?${params}`, { timeoutMs: 8000 });
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  const finalUri = uri || (q.data?.ok ? q.data?.imageUrl : null) || null;

  if (!finalUri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={fallbackIcon} size={Math.max(14, Math.round(size * 0.42))} color={colors.primary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: finalUri }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: colors.primarySoft,
      }}
      resizeMode="cover"
    />
  );
});

