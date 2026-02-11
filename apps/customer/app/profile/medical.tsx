import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { Card, Input, PrimaryButton, ScreenScroll, Text, colors, spacing } from "@mobile/ui";

type MedicalProfile = {
  allergies: string[];
  conditions: string[];
  notes: string | null;
  updatedAt: string | null;
};

function listToText(list: string[]) {
  return (list || []).join("\n");
}

function textToList(text: string) {
  return text
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export default function MedicalProfileScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);

  const profileQuery = useQuery({
    queryKey: ["me", "medical-profile"],
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return Api.request<MedicalProfile>("/users/me/medical-profile", { token });
    },
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const [allergiesText, setAllergiesText] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const data = profileQuery.data;
    if (!data) return;
    setAllergiesText(listToText(data.allergies || []));
    setConditionsText(listToText(data.conditions || []));
    setNotes(data.notes ? String(data.notes) : "");
  }, [profileQuery.data]);

  const payload = useMemo(
    () => ({
      allergies: textToList(allergiesText),
      conditions: textToList(conditionsText),
      notes: notes.trim() ? notes.trim() : null,
    }),
    [allergiesText, conditionsText, notes]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return Api.request<MedicalProfile>("/users/me/medical-profile", {
        method: "PATCH",
        token,
        body: payload,
      });
    },
    onSuccess: () => {
      profileQuery.refetch().catch(() => {});
      router.back();
    },
  });

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="titleLarge">Medical Profile</Text>
        <PrimaryButton title="Close" variant="secondary" onPress={() => router.back()} />
      </View>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Allergies</Text>
        <Input
          placeholder={"Example:\nPenicillin\nPeanuts"}
          multiline
          textAlignVertical="top"
          value={allergiesText}
          onChangeText={setAllergiesText}
          style={{ minHeight: 120 }}
        />
        <Text variant="caption" color={colors.inkMuted}>
          One per line (or comma-separated).
        </Text>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Conditions</Text>
        <Input
          placeholder={"Example:\nDiabetes\nHypertension"}
          multiline
          textAlignVertical="top"
          value={conditionsText}
          onChangeText={setConditionsText}
          style={{ minHeight: 120 }}
        />
        <Text variant="caption" color={colors.inkMuted}>
          One per line (or comma-separated).
        </Text>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subtitle">Notes (optional)</Text>
        <Input
          placeholder="Any extra notes for the pharmacy/doctor..."
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
          style={{ minHeight: 110 }}
        />
      </Card>

      <PrimaryButton
        title={saveMutation.isPending ? "Saving..." : "Save"}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || profileQuery.isLoading}
      />

      {profileQuery.isError ? (
        <Text variant="caption" color={colors.danger}>
          Unable to load medical profile.
        </Text>
      ) : null}
    </ScreenScroll>
  );
}
