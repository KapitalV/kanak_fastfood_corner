import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase-server";
import { logServerError } from "@/lib/server-logger";

const schema = z.object({ isAvailable: z.boolean() });

export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid availability value" }, { status: 400 });
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
    if (!profile || profile.role !== "delivery" || profile.is_active === false) return NextResponse.json({ error: "Delivery access required" }, { status: 403 });
    const { error } = await supabase.from("profiles").update({ is_available: parsed.data.isAvailable }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logServerError("profile.availability_update_failed", error);
    return NextResponse.json({ error: "Could not update availability" }, { status: 500 });
  }
}
