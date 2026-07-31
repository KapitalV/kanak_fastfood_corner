import type { CartLine } from "./types";

export const DELIVERY_FEE = 35;
export const TAX_RATE = 0.05;

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function cartTax(lines: CartLine[]) {
  return Math.round(cartSubtotal(lines) * TAX_RATE);
}

export function cartTotal(lines: CartLine[]) {
  if (lines.length === 0) {
    return 0;
  }

  return cartSubtotal(lines) + cartTax(lines) + DELIVERY_FEE;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function nextStoreStatus(status: string) {
  if (status === "placed") return "preparing";
  if (status === "preparing") return "ready";
  return null;
}

export function nextDeliveryStatus(status: string) {
  if (status === "assigned") return "accepted";
  if (status === "accepted") return "picked";
  if (status === "picked") return "in_transit";
  if (status === "in_transit") return "delivered";
  return null;
}

export function deliveryStatusToOrderStatus(status: string) {
  if (status === "accepted") return "assigned";
  if (status === "picked") return "picked";
  if (status === "in_transit") return "in_transit";
  if (status === "delivered") return "delivered";
  return "assigned";
}
