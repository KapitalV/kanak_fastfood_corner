import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase-server";

export async function DELETE() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Account deletion is not configured" }, { status: 503 });
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Could not delete account" }, { status: 500 });
  return NextResponse.json({ success: true });
}
