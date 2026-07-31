import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelOrder } from "@/repositories/orders.repo";

export async function requestOrderCancellation(client: SupabaseClient, customerId: string, orderId: string, reason?: string) {
  return cancelOrder(client, customerId, orderId, reason);
}

export function canCancelOrder(status: string) {
  return status === "awaiting_payment" || status === "placed";
}
