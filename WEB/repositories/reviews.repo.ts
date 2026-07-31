import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbReview } from "@/types/database";

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getReviewsForRestaurant(
  client: SupabaseClient,
  restaurantId: string,
  page = 0,
  pageSize = 20,
) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await client
    .from("reviews")
    .select("*, profiles(id,name,avatar_url)", { count: "exact" })
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { reviews: data as (DbReview & { profiles?: { id: string; name: string; avatar_url: string | null } | null })[], total: count ?? 0 };
}

export async function getReviewByOrder(
  client: SupabaseClient,
  orderId: string,
) {
  const { data, error } = await client
    .from("reviews")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data as DbReview | null;
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function createReview(
  client: SupabaseClient,
  values: {
    order_id: string;
    customer_id: string;
    restaurant_id: string;
    food_rating: number;
    restaurant_rating: number;
    delivery_rating: number | null;
    comment: string | null;
    images: string[];
  },
) {
  const { data, error } = await client
    .from("reviews")
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data as DbReview;
}

export async function updateReview(
  client: SupabaseClient,
  reviewId: string,
  customerId: string,
  values: {
    food_rating?: number;
    restaurant_rating?: number;
    delivery_rating?: number | null;
    comment?: string | null;
    images?: string[];
  },
) {
  const { data, error } = await client
    .from("reviews")
    .update(values)
    .eq("id", reviewId)
    .eq("customer_id", customerId)
    .select()
    .single();
  if (error) throw error;
  return data as DbReview;
}

export async function deleteReview(
  client: SupabaseClient,
  reviewId: string,
  customerId: string,
) {
  const { error } = await client
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("customer_id", customerId);
  if (error) throw error;
}

export async function replyToReview(
  client: SupabaseClient,
  reviewId: string,
  reply: string,
) {
  const { data, error } = await client
    .from("reviews")
    .update({
      restaurant_reply: reply,
      restaurant_replied_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select()
    .single();
  if (error) throw error;
  return data as DbReview;
}
