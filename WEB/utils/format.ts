import type { CartLine } from "@/types/domain";
import {
  CURRENCY,
  CURRENCY_LOCALE,
  DELIVERY_FEE_DEFAULT,
  FREE_DELIVERY_ABOVE,
  PACKAGING_CHARGE,
  TAX_RATE,
  PLATFORM_FEE,
} from "@/constants";

// ─── Price Calculations ───────────────────────────────────────────────────────

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function cartTax(lines: CartLine[]): number {
  return Math.round(cartSubtotal(lines) * TAX_RATE);
}

export function cartDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE_DEFAULT;
}

export function cartPackagingCharge(): number {
  return PACKAGING_CHARGE;
}

export function cartPlatformFee(): number {
  return PLATFORM_FEE;
}

export function cartTotal(lines: CartLine[], tip = 0, couponDiscount = 0): number {
  if (lines.length === 0) return 0;
  const subtotal = cartSubtotal(lines);
  return (
    subtotal +
    cartTax(lines) +
    cartDeliveryFee(subtotal) +
    cartPackagingCharge() +
    cartPlatformFee() +
    tip -
    couponDiscount
  );
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return formatDate(date);
}

// ─── Order Status Helpers ─────────────────────────────────────────────────────

export function nextStoreStatus(status: string): string | null {
  if (status === "placed") return "accepted";
  if (status === "accepted") return "preparing";
  if (status === "preparing") return "ready";
  return null;
}

export function nextDeliveryStatus(status: string): string | null {
  if (status === "assigned") return "accepted";
  if (status === "accepted") return "picked";
  if (status === "picked") return "in_transit";
  if (status === "in_transit") return "delivered";
  return null;
}

export function deliveryStatusToOrderStatus(deliveryStatus: string): string {
  const map: Record<string, string> = {
    accepted: "assigned",
    picked: "picked",
    in_transit: "in_transit",
    delivered: "delivered",
  };
  return map[deliveryStatus] ?? "assigned";
}

export function isOrderCancellable(status: string): boolean {
  return status === "placed";
}

export function getOrderStatusColor(status: string): string {
  const map: Record<string, string> = {
    placed: "amber",
    accepted: "blue",
    preparing: "orange",
    ready: "cyan",
    assigned: "purple",
    picked: "indigo",
    in_transit: "violet",
    delivered: "emerald",
    cancelled: "rose",
  };
  return map[status] ?? "zinc";
}

export function getOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    placed: "Order Placed",
    accepted: "Order Accepted",
    preparing: "Preparing",
    ready: "Ready for Pickup",
    assigned: "Delivery Assigned",
    picked: "Picked Up",
    in_transit: "On the Way",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status] ?? status.replace(/_/g, " ");
}
