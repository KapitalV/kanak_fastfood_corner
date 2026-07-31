import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { requireUser, handleAuthError, enforceBodyLimit, withTimeout } from "@/lib/auth";
import { rateLimit, requestKey, userKey } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-logger";

const schema = z.object({ orderId: z.string().uuid() });

async function handler(request: Request) {
  // ── Body size guard ──────────────────────────────────────────────────────
  const bodyGuard = enforceBodyLimit(request);
  if (bodyGuard) return bodyGuard;

  // ── Rate limit (IP) ──────────────────────────────────────────────────────
  const ipLimit = await rateLimit(requestKey(request, "convert-cod"), 10, 60_000, "convert-cod");
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipLimit.retryAfter / 1000)) } },
    );
  }

  // ── Validate input ───────────────────────────────────────────────────────
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  // ── Authenticate ─────────────────────────────────────────────────────────
  const { user, supabase } = await requireUser();

  // Per-user rate limit
  const uLimit = await rateLimit(userKey(user.id, "convert-cod"), 10, 60_000, "convert-cod");
  if (!uLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(uLimit.retryAfter / 1000)) } },
    );
  }

  // Role check: only customers should convert payment method
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_active === false) {
    return NextResponse.json({ error: "Account is not active", code: "ACCOUNT_INACTIVE" }, { status: 403 });
  }
  if (profile.role !== "customer") {
    return NextResponse.json({ error: "Only customers can change payment method", code: "FORBIDDEN" }, { status: 403 });
  }

  // ── Ownership via DB predicate (customer_id = user.id) ───────────────────
  const { data: order } = await supabase.from("orders")
    .select("payment_method,payment_status,razorpay_order_id,razorpay_payment_id")
    .eq("id", parsed.data.orderId)
    .eq("customer_id", user.id)
    .single();
  if (!order || order.payment_method !== "razorpay" || order.payment_status === "paid" || order.razorpay_payment_id) {
    return NextResponse.json({ error: "Order cannot be changed to cash" }, { status: 409 });
  }

  // ── Update via admin client with ownership predicate ─────────────────────
  const { error } = await getAdminSupabase().from("orders")
    .update({ payment_method: "cod", payment_status: "pending", order_status: "placed", razorpay_order_id: null })
    .eq("id", parsed.data.orderId)
    .eq("customer_id", user.id);
  if (error) throw error;

  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  try {
    return await withTimeout(handler(request));
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    logServerError("orders.convert_to_cod_failed", error);
    return NextResponse.json({ error: "Could not change payment method" }, { status: 500 });
  }
}
