import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { Card, Input, PrimaryButton, ScreenScroll, Text, colors, spacing } from "@mobile/ui";
import { Ionicons } from "@expo/vector-icons";

type Ticket = {
  id: number;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const FAQ = [
  {
    q: "How does “Pay after acceptance” work?",
    a: "After you place an order, the pharmacy confirms availability and final price. You’ll then get a payment request to complete checkout.",
  },
  { q: "What if something is out of stock?", a: "The pharmacy may adjust items or suggest alternatives before requesting payment." },
  { q: "How do I track my order?", a: "Open the order details to view the tracking card and map options." },
  { q: "Can I cancel my order?", a: "You can cancel from the order detail screen (when available for the order state)." },
];

export default function HelpScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);

  const ticketsQuery = useQuery({
    queryKey: ["support", "tickets"],
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return Api.request<Ticket[]>("/support/tickets", { token });
    },
    enabled: Boolean(token),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return Api.request<Ticket>("/support/tickets", {
        method: "POST",
        token,
        body: { subject: subject.trim(), message: message.trim(), category: "CUSTOMER" },
      });
    },
    onSuccess: (t) => {
      setSubject("");
      setMessage("");
      ticketsQuery.refetch().catch(() => {});
      router.push(`/support/${t.id}` as any);
    },
  });

  const canCreate = useMemo(() => subject.trim().length >= 4 && message.trim().length >= 10, [subject, message]);

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="titleLarge">Help & Support</Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="close" size={18} color={colors.inkMuted} />
        </Pressable>
      </View>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Quick answers</Text>
        <View style={{ gap: spacing.md }}>
          {FAQ.map((item) => (
            <View key={item.q} style={{ gap: 6 }}>
              <Text variant="label">{item.q}</Text>
              <Text variant="body" color={colors.inkMuted}>
                {item.a}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Contact support</Text>
        <Input label="Subject" placeholder="Example: Payment issue" value={subject} onChangeText={setSubject} />
        <Input
          label="Message"
          placeholder="Tell us what happened..."
          multiline
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
          style={{ minHeight: 120 }}
        />
        <PrimaryButton
          title={createMutation.isPending ? "Sending..." : "Create ticket"}
          onPress={() => createMutation.mutate()}
          disabled={!canCreate || createMutation.isPending}
        />
        {createMutation.isError ? (
          <Text variant="caption" color={colors.danger}>
            Unable to create ticket.
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">My tickets</Text>
        {ticketsQuery.isLoading ? (
          <Text variant="body" color={colors.inkMuted}>
            Loading…
          </Text>
        ) : ticketsQuery.isError ? (
          <Text variant="body" color={colors.danger}>
            Unable to load tickets.
          </Text>
        ) : (ticketsQuery.data || []).length === 0 ? (
          <Text variant="body" color={colors.inkMuted}>
            No tickets yet.
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {(ticketsQuery.data || []).map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/support/${t.id}` as any)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  paddingVertical: 10,
                }}
              >
                <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{t.subject}</Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {t.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </Card>
    </ScreenScroll>
  );
}

