import { supabase } from "@/lib/supabase";

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}
