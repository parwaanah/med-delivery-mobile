import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { Card, Input, PrimaryButton, ScreenScroll, Text, colors, spacing } from "@mobile/ui";
import { Ionicons } from "@expo/vector-icons";

type Message = {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  senderId: number;
};

type Ticket = {
  id: number;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

export default function SupportTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const myUserId = useAuthStore((s) => s.user?.id || null);

  const ticketId = Number(params.id);
  const valid = Number.isFinite(ticketId) && ticketId > 0;

  const ticketQuery = useQuery({
    queryKey: ["support", "tickets", ticketId],
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return Api.request<Ticket>(`/support/tickets/${ticketId}`, { token });
    },
    enabled: Boolean(token) && valid,
    refetchInterval: 10_000,
  });

  const [draft, setDraft] = useState("");

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const msg = draft.trim();
      if (!msg) throw new Error("Message required");
      return Api.request(`/support/tickets/${ticketId}/messages`, {
        method: "POST",
        token,
        body: { message: msg, attachments: [] },
      });
    },
    onSuccess: () => {
      setDraft("");
      ticketQuery.refetch().catch(() => {});
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return Api.request(`/support/tickets/${ticketId}/close`, { method: "PATCH", token });
    },
    onSuccess: () => ticketQuery.refetch().catch(() => {}),
  });

  const messages = useMemo(() => ticketQuery.data?.messages || [], [ticketQuery.data]);

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="titleLarge">Ticket</Text>
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
          <Ionicons name="chevron-back" size={18} color={colors.inkMuted} />
        </Pressable>
      </View>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subtitle">{ticketQuery.data?.subject || "…"}</Text>
        <Text variant="caption" color={colors.inkMuted}>
          Status: {ticketQuery.data?.status || "—"}
        </Text>
        {ticketQuery.data?.status !== "CLOSED" ? (
          <PrimaryButton
            title={closeMutation.isPending ? "Closing..." : "Close ticket"}
            variant="secondary"
            onPress={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
          />
        ) : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Messages</Text>
        {ticketQuery.isLoading ? (
          <Text variant="body" color={colors.inkMuted}>
            Loading…
          </Text>
        ) : ticketQuery.isError ? (
          <Text variant="body" color={colors.danger}>
            Unable to load ticket.
          </Text>
        ) : messages.length === 0 ? (
          <Text variant="body" color={colors.inkMuted}>
            No messages yet.
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {messages.map((m) => {
              const mine = myUserId != null && Number(m.senderId) === Number(myUserId);
              return (
                <View
                  key={m.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "92%",
                    backgroundColor: mine ? "#E9F7F1" : "#F7F8FA",
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text variant="body">{m.message}</Text>
                  <Text variant="caption" color={colors.inkMuted} style={{ marginTop: 6 }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {ticketQuery.data?.status === "CLOSED" ? null : (
        <Card style={{ gap: spacing.md }}>
          <Text variant="subtitle">Reply</Text>
          <Input
            placeholder="Type your message…"
            multiline
            textAlignVertical="top"
            value={draft}
            onChangeText={setDraft}
            style={{ minHeight: 110 }}
          />
          <PrimaryButton
            title={sendMutation.isPending ? "Sending..." : "Send"}
            onPress={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || draft.trim().length === 0}
          />
          {sendMutation.isError ? (
            <Text variant="caption" color={colors.danger}>
              Unable to send message.
            </Text>
          ) : null}
        </Card>
      )}
    </ScreenScroll>
  );
}

