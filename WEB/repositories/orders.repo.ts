import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbOrder } from "@/types/database";

export async function listCustomerOrders(client: SupabaseClient, customerId: string) {
  const { data, error } = await client.from("orders").select("*, restaurants(id,name,address,image_url), order_items(*)").eq("customer_id", customerId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as DbOrder[];
}

export async function cancelOrder(client: SupabaseClient, customerId: string, orderId: string, reason = "Cancelled by customer") {
  const { data, error } = await client.from("orders").update({ order_status: "cancelled", cancelled_reason: reason }).eq("id", orderId).eq("customer_id", customerId).in("order_status", ["awaiting_payment", "placed"]).select().single();
  if (error) throw error;
  return data as DbOrder;
}

// ─── Order with timeline (delivery task timestamps) ──────────────────────────

export async function getOrderWithTimeline(client: SupabaseClient, orderId: string) {
  const { data, error } = await client
    .from("orders")
    .select("*, restaurants(id,name,address,image_url,phone), order_items(*), delivery_tasks(*), reviews(id)")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Reorder: load current products by ID with live prices ───────────────────

export async function getReorderProducts(client: SupabaseClient, productIds: string[]) {
  if (productIds.length === 0) return [];
  const { data, error } = await client
    .from("products")
    .select("id, restaurant_id, name, description, price, image_url, category, is_veg, is_available")
    .in("id", productIds);
  if (error) throw error;
  return data ?? [];
}

// ─── Get order items for reorder ─────────────────────────────────────────────

export async function getOrderItems(client: SupabaseClient, orderId: string) {
  const { data, error } = await client
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  if (error) throw error;
  return data ?? [];
}
