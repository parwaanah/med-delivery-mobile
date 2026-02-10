import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, ScrollView, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Card, PrimaryButton, Input, colors, spacing, Screen, HeartRateLoader, useToast } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";
import { getLegalGate } from "../../lib/legalGate";
import { PrescriptionPreviewModal } from "../../components/PrescriptionPreviewModal";

type Prescription = {
  id: number;
  url: string;
  status: string;
  createdAt?: string;
};

type LegalConfig = { version?: string; required?: boolean };

function statusTone(statusRaw: any): { bg: string; fg: string; label: string } {
  const s = String(statusRaw || "").toUpperCase().trim();
  if (s === "APPROVED") return { bg: "rgba(22,142,106,0.12)", fg: colors.primary, label: "Approved" };
  if (s === "REJECTED") return { bg: "rgba(229,57,53,0.12)", fg: colors.danger, label: "Rejected" };
  if (s === "EXPIRED") return { bg: "rgba(41,45,50,0.10)", fg: colors.inkMuted, label: "Expired" };
  return { bg: "rgba(251,176,59,0.14)", fg: colors.ink, label: "Pending" };
}

export default function AttachPrescriptionScreen() {
  const router = useRouter();
  const { orderId, replaceId } = useLocalSearchParams<{ orderId?: string; replaceId?: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToast();
  const [legalCfg, setLegalCfg] = useState<LegalConfig | null>(null);
  const [legalAccepted, setLegalAccepted] = useState<boolean | null>(null);

  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [localMime, setLocalMime] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const effectiveUrl = useMemo(() => {
    if (pickedId != null) {
      const p = items.find((x) => x.id === pickedId);
      return p?.url || "";
    }
    return url.trim();
  }, [pickedId, items, url]);

  const ensureLegalAccepted = async (): Promise<boolean> => {
    if (!token) return true;
    try {
      const gate = await getLegalGate(token);
      setLegalCfg((gate.config as any) || null);
      setLegalAccepted(gate.accepted);
      if (!gate.required || gate.accepted) return true;

      toast.show("Accept terms to continue");
      router.push("/legal");
      return false;
    } catch {
      // If legal endpoints are down, don't hard-block prescriptions.
      return true;
    }
  };

  const load = useCallback(async () => {
    if (!token || !user) {
      router.push("/(auth)/phone");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await Api.request<Prescription[]>("/prescriptions", { token });
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, [token, user, router, logout]);

  useEffect(() => {
    void load();
  }, [load]);

  const attachToOrder = async () => {
    if (!token) return;
    if (!(await ensureLegalAccepted())) return;
    const oid = orderId ? Number(orderId) : NaN;
    if (!Number.isFinite(oid)) {
      setError("Missing order id. Open this screen from an order that requires a prescription.");
      return;
    }
    if (!effectiveUrl) {
      setError("Provide a prescription URL or pick an existing one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await Api.request(`/orders/${oid}/prescription`, { method: "POST", token, body: { url: effectiveUrl } });
      toast.show("Prescription attached");
      router.replace(`/orders/${oid}`);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to attach prescription");
    } finally {
      setBusy(false);
    }
  };

  const replacePrescription = async () => {
    if (!token) return;
    if (!(await ensureLegalAccepted())) return;
    const pid = replaceId ? Number(replaceId) : NaN;
    if (!Number.isFinite(pid)) {
      setError("Missing prescription id. Open this screen from a prescription you want to replace.");
      return;
    }
    if (!effectiveUrl) {
      setError("Provide a prescription URL or upload a file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await Api.request(`/prescriptions/${pid}`, { method: "PATCH", token, body: { url: effectiveUrl } });
      toast.show("Prescription updated");
      router.back();
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to update prescription");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (uri: string, mime: string, fileName?: string) => {
    if (!token) return;
    if (!(await ensureLegalAccepted())) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append(
        "file",
        {
          uri,
          type: mime,
          name: fileName || `prescription-${Date.now()}`,
        } as any
      );

      const res = await Api.request<{ url?: string }>("/uploads/doc", { method: "POST", token, body: form });
      const nextUrl = (res as any)?.url;
      if (!nextUrl || typeof nextUrl !== "string") {
        throw new Error("Upload succeeded but no URL was returned");
      }
      setPickedId(null);
      setUrl(nextUrl);
      toast.show("Uploaded");
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    setError(null);
    try {
      // Optional dependency: if not installed, we show a helpful message instead of crashing.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ImagePicker: any = require("expo-image-picker");
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const asset = res.assets[0];
      setLocalUri(asset.uri);
      setLocalMime(asset.mimeType || "image/jpeg");
    } catch {
      setError("Gallery picker is not available in this build. Install expo-image-picker (then restart).");
    }
  };

  const takePhoto = async () => {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ImagePicker: any = require("expo-image-picker");
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError("Camera permission is required.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const asset = res.assets[0];
      setLocalUri(asset.uri);
      setLocalMime(asset.mimeType || "image/jpeg");
    } catch {
      setError("Camera picker is not available in this build. Install expo-image-picker (then restart).");
    }
  };

  const pickPdf = async () => {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const DocumentPicker: any = require("expo-document-picker");
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const asset = res.assets[0];
      setLocalUri(asset.uri);
      setLocalMime(asset.mimeType || (asset.name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"));
    } catch {
      setError("Document picker is not available in this build. Install expo-document-picker (then restart).");
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: 140 }}>
        <Text variant="titleLarge">{replaceId ? "Replace Prescription" : "Attach Prescription"}</Text>

        {legalCfg?.required && legalAccepted === false ? (
          <Card style={{ gap: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
            <Text variant="subtitle">Action needed</Text>
            <Text variant="body" color={colors.inkMuted}>
              Please accept the latest Terms & Privacy before uploading or attaching a prescription.
            </Text>
            <PrimaryButton title="Review & accept" onPress={() => router.push("/legal")} />
          </Card>
        ) : null}

        <Card style={{ gap: 6 }}>
          <Text variant="subtitle">{replaceId ? "Replace existing" : "Attach to order"}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {replaceId
              ? `Prescription #${replaceId}`
              : orderId
                ? `Order #${orderId}`
                : "Open this screen from an order that requires a prescription."}
          </Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Upload</Text>
          <Text variant="caption" color={colors.inkMuted}>
            You can upload a photo/PDF or paste a URL. If pickers are not available, install the optional Expo pickers and
            restart Metro.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <PrimaryButton title="Take photo" onPress={takePhoto} disabled={busy || uploading} />
            <PrimaryButton title="Gallery" onPress={pickFromGallery} disabled={busy || uploading} />
            <PrimaryButton title="PDF" onPress={pickPdf} disabled={busy || uploading} />
          </View>
        </Card>

        {localUri ? (
          <Card style={{ gap: spacing.sm }}>
            <Text variant="subtitle">Preview</Text>
            {localMime?.startsWith("image/") ? (
              <Image
                source={{ uri: localUri }}
                style={{ width: "100%", height: 180, borderRadius: 14, backgroundColor: colors.surface }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  height: 120,
                  borderRadius: 14,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="label">PDF selected</Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {localUri.split("/").pop()}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <PrimaryButton
                title="Upload now"
                onPress={() => upload(localUri, localMime || "application/octet-stream")}
                loading={uploading}
                disabled={busy}
              />
              <PrimaryButton title="Full preview" onPress={() => setPreviewOpen(true)} disabled={busy || uploading} />
              <PrimaryButton
                title="Clear"
                onPress={() => {
                  setLocalUri(null);
                  setLocalMime(null);
                }}
                disabled={busy || uploading}
              />
            </View>
          </Card>
        ) : null}

        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Paste URL</Text>
          <Input
            label="Prescription URL"
            value={url}
            onChangeText={(v) => {
              setLocalUri(null);
              setLocalMime(null);
              setPickedId(null);
              setUrl(v);
            }}
            placeholder="https://..."
            autoCapitalize="none"
          />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text variant="subtitle">Or pick existing</Text>
          {loading ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: spacing.md }}>
              <HeartRateLoader width={260} height={72} color={colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <Text variant="caption" color={colors.inkMuted}>
              No saved prescriptions yet.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {items.slice(0, 8).map((p) => {
                const selected = pickedId === p.id;
                const t = statusTone(p.status);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setLocalUri(null);
                      setLocalMime(null);
                      setUrl("");
                      setPickedId(p.id);
                    }}
                    style={{
                      padding: spacing.md,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : colors.surface,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text variant="label">#{p.id}</Text>
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 999,
                          backgroundColor: t.bg,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text variant="caption" color={t.fg}>
                          {t.label}
                        </Text>
                      </View>
                    </View>
                    <Text variant="caption" color={colors.inkMuted}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {error ? (
          <Text variant="body" color={colors.danger}>
            {error}
          </Text>
        ) : null}

        <PrimaryButton
          title={replaceId ? "Save replacement" : "Attach to order"}
          onPress={replaceId ? replacePrescription : attachToOrder}
          loading={busy}
          disabled={uploading}
        />
      </ScrollView>

      <PrescriptionPreviewModal
        visible={previewOpen}
        uri={localUri || effectiveUrl || null}
        mime={
          localMime ||
          (effectiveUrl ? (/\.(pdf)$/i.test(effectiveUrl) ? "application/pdf" : "image/jpeg") : null)
        }
        title={replaceId ? "Replacement preview" : "Prescription preview"}
        onClose={() => setPreviewOpen(false)}
      />
    </Screen>
  );
}
