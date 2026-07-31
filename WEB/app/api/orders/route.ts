import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { requireUser, handleAuthError, enforceBodyLimit, withTimeout } from "@/lib/auth";
import { rateLimit, requestKey, userKey } from "@/lib/rate-limit";
import { createOrderWithItems } from "@/repositories/checkout.repo";
import { createSupabasePricingRepository } from "@/repositories/pricing.repo";
import { orderRequestSchema, priceCart, PricingError } from "@/services/pricing.service";
import { logServerError } from "@/lib/server-logger";

async function handler(request: Request) {
  // ── Body size guard ──────────────────────────────────────────────────────
  const bodyGuard = enforceBodyLimit(request);
  if (bodyGuard) return bodyGuard;

  // ── Rate limit (IP) ──────────────────────────────────────────────────────
  const ipLimit = await rateLimit(requestKey(request, "orders-create"), 10, 60_000, "orders-create");
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many order attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipLimit.retryAfter / 1000)) } },
    );
  }

  // ── Authenticate + authorize ─────────────────────────────────────────────
  const { user, supabase } = await requireUser();

  // Per-user rate limit
  const uLimit = await rateLimit(userKey(user.id, "orders-create"), 10, 60_000, "orders-create");
  if (!uLimit.ok) {
    return NextResponse.json(
      { error: "Too many order attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(uLimit.retryAfter / 1000)) } },
    );
  }

  // Role check: only customers should create orders
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_active === false) {
    return NextResponse.json({ error: "Account is not active", code: "ACCOUNT_INACTIVE" }, { status: 403 });
  }
  if (profile.role !== "customer") {
    return NextResponse.json({ error: "Only customers can place orders", code: "FORBIDDEN" }, { status: 403 });
  }

  let idempotencyKey: string | undefined;
  try {
    idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return NextResponse.json({ error: "A valid Idempotency-Key is required", code: "INVALID_IDEMPOTENCY_KEY" }, { status: 400 });
    }
    const parsed = orderRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid order request", code: "INVALID_ORDER_REQUEST" }, { status: 400 });
    const admin = getAdminSupabase();
    const { data: existingOrder, error: existingOrderError } = await admin.from("orders")
      .select("*").eq("customer_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existingOrderError) throw existingOrderError;
    if (existingOrder) return NextResponse.json({ order: existingOrder, total: Number(existingOrder.total_amount) });
    const pricing = await priceCart(createSupabasePricingRepository(admin), parsed.data, user.id);
    const { data, error: orderError } = await createOrderWithItems(admin, {
      p_customer_id: user.id,
      p_idempotency_key: idempotencyKey,
      p_restaurant_id: pricing.restaurantId,
      p_total_amount: pricing.total,
      p_subtotal: pricing.subtotal,
      p_delivery_fee: pricing.deliveryFee,
      p_tax_amount: pricing.gst,
      p_packaging_charge: pricing.packagingCharge,
      p_platform_fee: pricing.platformFee,
      p_tip_amount: pricing.tip,
      p_coupon_id: pricing.couponId,
      p_coupon_discount: pricing.discount,
      p_payment_method: parsed.data.paymentMethod,
      p_payment_status: parsed.data.paymentMethod === "cod" ? "pending" : "razorpay",
      p_order_status: "awaiting_payment",
      p_delivery_address: pricing.deliveryAddress,
      p_delivery_lat: pricing.deliveryLat,
      p_delivery_lng: pricing.deliveryLng,
      p_delivery_instructions: pricing.deliveryInstructions,
      p_special_instructions: parsed.data.instructions || null,
      p_items: pricing.lines.map((line) => ({
        product_id: line.productId,
        name_snapshot: line.name,
        price_snapshot: line.unitPrice,
        image_snapshot: line.imageUrl,
        quantity: line.quantity,
      })),
    });
    const order = Array.isArray(data) ? data[0] : data;
    if (orderError || !order) throw new Error("Order insert failed");
    if (parsed.data.paymentMethod === "cod") {
      const { error: codStatusError } = await admin.from("orders").update({ order_status: "placed" }).eq("id", order.id).eq("order_status", "awaiting_payment");
      if (codStatusError) throw codStatusError;
      order.order_status = "placed";
    }
    return NextResponse.json({ order, total: pricing.total, pricing: { lines: pricing.lines, subtotal: pricing.subtotal, gst: pricing.gst, deliveryFee: pricing.deliveryFee, packagingCharge: pricing.packagingCharge, platformFee: pricing.platformFee, discount: pricing.discount, tip: pricing.tip, total: pricing.total } });
  } catch (error) {
    if (idempotencyKey) {
      const { data: existingOrder } = await getAdminSupabase().from("orders")
        .select("*").eq("customer_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existingOrder) return NextResponse.json({ order: existingOrder, total: Number(existingOrder.total_amount) });
    }
    if (error instanceof PricingError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    if (error instanceof Error && error.message.includes("Coupon usage limit")) return NextResponse.json({ error: error.message, code: "COUPON_USAGE_LIMIT" }, { status: 400 });
    logServerError("orders.create_failed", error);
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await withTimeout(handler(request));
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    logServerError("orders.unexpected_error", error);
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  }
}
