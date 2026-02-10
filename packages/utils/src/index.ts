export const isDev = process.env.NODE_ENV !== "production";

export function formatPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export function formatPrice(amount: number, currency = "₹") {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${currency}${Math.round(value)}`;
}
