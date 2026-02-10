import { useCallback, useEffect, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Text, Card, PrimaryButton, Input, colors, spacing, ScreenScroll, HeartRateLoader } from "@mobile/ui";
import { Api } from "@mobile/api";
import { useAuthStore } from "@mobile/auth";

type Address = {
  id: number;
  label?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pin: string;
  landmark?: string;
  isDefault?: boolean;
};

function validateAddress(form: {
  label?: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  pin: string;
}) {
  if (!form.name.trim()) return "Name is required";
  if (!form.phone.trim()) return "Phone is required";
  if (!form.line1.trim()) return "Address line 1 is required";
  if (!form.city.trim()) return "City is required";
  if (!form.pin.trim()) return "PIN is required";
  return null;
}

export default function AddressesScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "Home",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pin: "",
    landmark: "",
    isDefault: true,
  });

  const load = useCallback(async () => {
    if (!token || !user) {
      router.push("/(auth)/phone");
      return;
    }
    setInitialLoading(true);
    try {
      const res = await Api.request<Address[]>("/users/me/addresses", { token });
      setAddresses(res || []);
    } catch (e: any) {
      if (e?.status === 401) {
        await logout();
        router.replace("/(auth)/phone");
        return;
      }
      setError(e?.message || "Failed to load addresses");
    } finally {
      setInitialLoading(false);
    }
  }, [token, user, router, logout]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm({
      label: "Home",
      name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pin: "",
      landmark: "",
      isDefault: true,
    });
    setEditingId(null);
  };

  const onSave = async () => {
    if (!token) return;
    const validation = validateAddress(form);
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        await Api.request(`/users/me/addresses/${editingId}`, { method: "PATCH", token, body: form });
      } else {
        await Api.request("/users/me/addresses", { method: "POST", token, body: form });
      }
      setShowAdd(false);
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (addr: Address) => {
    if (!token) return;
    Alert.alert("Delete address?", "This will remove the address permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          setError(null);
          try {
            await Api.request(`/users/me/addresses/${addr.id}`, { method: "DELETE", token });
            await load();
          } catch (e: any) {
            setError(e?.message || "Failed to delete address");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const onEdit = (addr: Address) => {
    setEditingId(addr.id);
    setShowAdd(true);
    setError(null);
    setForm({
      label: addr.label || "Home",
      name: addr.name || "",
      phone: addr.phone || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pin: addr.pin || "",
      landmark: addr.landmark || "",
      isDefault: Boolean(addr.isDefault),
    });
  };

  const onSetDefault = async (addr: Address) => {
    if (!token) return;
    if (addr.isDefault) return;
    setLoading(true);
    setError(null);
    try {
      await Api.request(`/users/me/addresses/${addr.id}`, { method: "PATCH", token, body: { isDefault: true } });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to set default");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenScroll contentStyle={{ gap: spacing.lg }}>
      <Text variant="titleLarge">Addresses</Text>

      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="subtitle">Saved</Text>
          <Pressable onPress={() => setShowAdd((v) => !v)}>
            <Text variant="label" color={colors.primary}>
              {showAdd ? "Cancel" : "Add new"}
            </Text>
          </Pressable>
        </View>
        {initialLoading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: spacing.md }}>
            <HeartRateLoader width={220} height={56} color={colors.primary} />
          </View>
        ) : (
          <>
            {addresses.length === 0 ? <Text>No addresses yet.</Text> : null}
            {addresses.map((addr) => (
              <Card
                key={addr.id}
                style={{
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: addr.isDefault ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text variant="label">{addr.label || "Home"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {!addr.isDefault ? (
                      <Pressable onPress={() => onSetDefault(addr)}>
                        <Text variant="label" color={colors.primary}>
                          Set default
                        </Text>
                      </Pressable>
                    ) : (
                      <Text variant="caption" color={colors.primary}>
                        Default
                      </Text>
                    )}
                    <Pressable onPress={() => onEdit(addr)}>
                      <Text variant="label" color={colors.primary}>
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => onDelete(addr)}>
                      <Text variant="label" color={colors.danger}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Text variant="body">{addr.name}</Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {addr.line1}, {addr.city} {addr.pin}
                </Text>
              </Card>
            ))}
          </>
        )}
      </Card>

      {showAdd ? (
        <Card style={{ gap: spacing.sm }}>
          <Input label="Label" value={form.label} onChangeText={(v) => setForm({ ...form, label: v })} />
          <Input label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
          <Input label="Address line 1" value={form.line1} onChangeText={(v) => setForm({ ...form, line1: v })} />
          <Input label="Address line 2" value={form.line2} onChangeText={(v) => setForm({ ...form, line2: v })} />
          <Input label="City" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
          <Input label="State" value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} />
          <Input label="PIN" value={form.pin} onChangeText={(v) => setForm({ ...form, pin: v })} />
          <Input label="Landmark" value={form.landmark} onChangeText={(v) => setForm({ ...form, landmark: v })} />
          {error ? (
            <Text variant="caption" color={colors.danger}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton title={editingId ? "Update address" : "Save address"} onPress={onSave} loading={loading} />
        </Card>
      ) : null}
    </ScreenScroll>
  );
}

