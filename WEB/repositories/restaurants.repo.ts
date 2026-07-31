import { supabase } from "@/lib/supabase";
import type { DbProduct, DbRestaurant } from "@/types/database";

export async function listApprovedRestaurants() {
  const { data, error } = await supabase.from("restaurants").select("*").eq("is_approved", true).order("avg_rating", { ascending: false });
  if (error) throw error;
  return data as DbRestaurant[];
}

export async function getRestaurant(id: string) {
  const { data, error } = await supabase.from("restaurants").select("*, products(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as (DbRestaurant & { products: DbProduct[] }) | null;
}
