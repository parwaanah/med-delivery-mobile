import { Api } from "@mobile/api";

export type AnalyticsEventName =
  | "auth_success"
  | "search"
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "order_created"
  | "payment_requested"
  | "payment_success"
  | "payment_fail";

export async function track(name: AnalyticsEventName, props: Record<string, any> = {}, token?: string | null) {
  try {
    await Api.request("/analytics/track", {
      method: "POST",
      token: token || undefined,
      body: { name, props },
    });
  } catch {
    // ignore
  }
}

