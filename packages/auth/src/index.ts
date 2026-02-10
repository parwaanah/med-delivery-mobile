import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { Api } from "@mobile/api";
import { queryClient } from "@mobile/api";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export type User = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  status: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  otpPreview: string | null;
  loading: boolean;
  bootstrap: () => Promise<void>;
  loginWithOtp: (params: { phone: string; otp: string }) => Promise<void>;
  sendLoginOtp: (phone: string) => Promise<string | null>;
  updateMe: (params: { name?: string; email?: string }) => Promise<User>;
  logout: () => Promise<void>;
};

async function saveTokens(access?: string, refresh?: string) {
  if (access) await SecureStore.setItemAsync(ACCESS_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

async function loadTokens() {
  const access = await SecureStore.getItemAsync(ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  return { access, refresh };
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

async function fetchMe(token: string) {
  return Api.request<User>("/users/me", { token });
}

async function refreshSession(refreshToken: string) {
  return Api.request<{ user: User; access_token: string; refresh_token?: string }>(
    "/auth/refresh",
    { method: "POST", body: { refresh_token: refreshToken } }
  );
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  otpPreview: null,
  loading: false,

  bootstrap: async () => {
    try {
      set({ loading: true });
      const { access, refresh } = await loadTokens();
      if (!access && !refresh) {
        set({ user: null, accessToken: null, refreshToken: null, loading: false });
        return;
      }

      // Prefer access token when available.
      if (access) {
        try {
          const me = await fetchMe(access);
          set({ user: me, accessToken: access, refreshToken: refresh || null, loading: false });
          return;
        } catch (e: any) {
          // Fall back to refresh on 401 when we have a refresh token.
          if (e?.status !== 401 || !refresh) throw e;
        }
      }

      if (!refresh) throw new Error("No refresh token");
      const out = await refreshSession(refresh);
      await saveTokens(out.access_token, out.refresh_token || refresh);
      set({
        user: out.user,
        accessToken: out.access_token,
        refreshToken: out.refresh_token || refresh,
        loading: false,
      });
    } catch (e) {
      await clearTokens();
      set({ user: null, accessToken: null, refreshToken: null, loading: false });
    }
  },

  sendLoginOtp: async (phone: string) => {
    const res = await Api.request<{ message: string; otp?: string }>(
      "/auth/send-login-otp",
      { method: "POST", body: { phone } }
    );
    const otp = res?.otp ? String(res.otp) : null;
    set({ otpPreview: otp });
    return otp;
  },

  loginWithOtp: async ({ phone, otp }) => {
    set({ loading: true });
    try {
      const res = await Api.request<{ user: User; access_token: string; refresh_token: string }>(
        "/auth/login-otp",
        { method: "POST", body: { phone, otp } }
      );
      await saveTokens(res.access_token, res.refresh_token);
      set({
        user: res.user,
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        otpPreview: null,
        loading: false,
      });
      queryClient.clear();
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  updateMe: async (params: { name?: string; email?: string }) => {
    const token = get().accessToken;
    if (!token) throw new Error("Not authenticated");

    const updated = await Api.request<User>("/users/me", {
      method: "PATCH",
      token,
      body: params,
    });

    set({ user: updated });
    return updated;
  },

  logout: async () => {
    const token = get().accessToken || undefined;
    try {
      if (token) await Api.request("/auth/logout", { method: "POST", token });
    } catch {}
    await clearTokens();
    set({ user: null, accessToken: null, refreshToken: null });
    queryClient.clear();
  },
}));
