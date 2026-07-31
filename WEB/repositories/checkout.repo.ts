import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckoutRepository = SupabaseClient;

export async function createOrderWithItems(client: CheckoutRepository, values: Record<string, unknown>) {
  return client.rpc("create_order_with_items", values);
}
