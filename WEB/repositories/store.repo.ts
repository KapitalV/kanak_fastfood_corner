import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbRestaurant, DbCoupon, DbRestaurantEarning } from "@/types/database";

// ─── Restaurant ──────────────────────────────────────────────────────────────

export async function getStoreRestaurant(client: SupabaseClient, ownerId: string) {
  const { data, error } = await client
    .from("restaurants")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DbRestaurant | null;
}

export async function updateRestaurant(
  client: SupabaseClient,
  restaurantId: string,
  ownerId: string,
  values: Partial<Pick<DbRestaurant, "name" | "description" | "address" | "cuisine_type" | "image_url" | "logo_url" | "phone" | "email" | "is_open">>,
) {
  const { data, error } = await client
    .from("restaurants")
    .update(values)
    .eq("id", restaurantId)
    .eq("owner_id", ownerId)
    .select()
    .single();
  if (error) throw error;
  return data as DbRestaurant;
}

// ─── Store Orders ────────────────────────────────────────────────────────────

export async function listStoreOrders(
  client: SupabaseClient,
  restaurantId: string,
  statusFilter?: string,
  page = 0,
  pageSize = 20,
) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = client
    .from("orders")
    .select("*, restaurants(id,name), order_items(*), profiles!orders_customer_id_fkey(id,name,phone)", { count: "exact" })
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("order_status", statusFilter);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: data ?? [], total: count ?? 0 };
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export async function listStoreCoupons(client: SupabaseClient, restaurantId: string) {
  const { data, error } = await client
    .from("coupons")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as DbCoupon[];
}

export async function createCoupon(
  client: SupabaseClient,
  values: {
    code: string;
    description: string;
    discount_type: "flat" | "percent";
    discount_value: number;
    min_order_amount: number;
    max_discount: number | null;
    max_uses: number | null;
    valid_from: string;
    valid_until: string | null;
    restaurant_id: string;
    is_active: boolean;
  },
) {
  const { data, error } = await client
    .from("coupons")
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data as DbCoupon;
}

export async function updateCoupon(
  client: SupabaseClient,
  couponId: string,
  restaurantId: string,
  values: Partial<Pick<DbCoupon, "description" | "discount_type" | "discount_value" | "min_order_amount" | "max_discount" | "max_uses" | "valid_until" | "is_active">>,
) {
  const { data, error } = await client
    .from("coupons")
    .update(values)
    .eq("id", couponId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();
  if (error) throw error;
  return data as DbCoupon;
}

// ─── Earnings ────────────────────────────────────────────────────────────────

export async function listEarnings(
  client: SupabaseClient,
  restaurantId: string,
  statusFilter?: string,
) {
  let query = client
    .from("restaurant_earnings")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as DbRestaurantEarning[];
}

export async function getEarningsSummary(
  client: SupabaseClient,
  restaurantId: string,
) {
  const { data, error } = await client
    .from("restaurant_earnings")
    .select("gross_amount, platform_fee, net_amount, status")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  const rows = data ?? [];
  const totalGross = rows.reduce((s, r) => s + Number(r.gross_amount), 0);
  const totalFee = rows.reduce((s, r) => s + Number(r.platform_fee), 0);
  const totalNet = rows.reduce((s, r) => s + Number(r.net_amount), 0);
  const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.net_amount), 0);
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.net_amount), 0);
  return { totalGross, totalFee, totalNet, pending, paid, count: rows.length };
}

// ─── Products (store management) ─────────────────────────────────────────────

export async function listStoreProducts(client: SupabaseClient, restaurantId: string) {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createProduct(
  client: SupabaseClient,
  values: {
    restaurant_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string | null;
    is_veg: boolean;
    is_available: boolean;
  },
) {
  const { data, error } = await client.from("products").insert(values).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  client: SupabaseClient,
  productId: string,
  restaurantId: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("products")
    .update(values)
    .eq("id", productId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(
  client: SupabaseClient,
  productId: string,
  restaurantId: string,
) {
  const { error } = await client
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getStoreAnalytics(
  client: SupabaseClient,
  restaurantId: string,
  days?: number,
) {
  let query = client
    .from("restaurant_earnings")
    .select("gross_amount, net_amount, platform_fee, created_at, status")
    .eq("restaurant_id", restaurantId);
  if (days) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    query = query.gte("created_at", since);
  }
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
