import { supabase } from "@/lib/supabase";
import type { DbProfile } from "@/types/database";

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as DbProfile | null;
}

export async function updateProfile(userId: string, values: Partial<DbProfile>) {
  const allowed = (({ name, phone, avatar_url, gender, dob }) => ({ name, phone, avatar_url, gender, dob }))(values);
  const { data, error } = await supabase.from("profiles").update(allowed).eq("id", userId).select().single();
  if (error) throw error;
  return data as DbProfile;
}
