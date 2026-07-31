import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { requireUser, handleAuthError, enforceBodyLimit, withTimeout } from "@/lib/auth";
import { rateLimit, requestKey, userKey } from "@/lib/rate-limit";
import { createPaymentOrderSchema } from "@/utils/validation";
import { getOrderForPayment, setRazorpayOrderId } from "@/repositories/payments.repo";
import { logServerError } from "@/lib/server-logger";

/** Orders older than this window must be re-created before payment. */
const ORDER_STALENESS_MS = 15 * 60 * 1000; // 15 minutes

async function handler(req: Request) {
  // ── Body size guard ──────────────────────────────────────────────────────
  const bodyGuard = enforceBodyLimit(req);
  if (bodyGuard) return bodyGuard;

  // ── Rate limit (IP) ──────────────────────────────────────────────────────
  const ipLimit = await rateLimit(requestKey(req, "razorpay-create"), 10, 60_000, "razorpay-create");
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipLimit.retryAfter / 1000)) } },
    );
  }

  // ── Validate input ───────────────────────────────────────────────────────
  const parsed = createPaymentOrderSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
  }
  const { orderId } = parsed.data;

  // ── Authenticate ─────────────────────────────────────────────────────────
  const { user, supabase } = await requireUser();

  // Per-user rate limit
  const uLimit = await rateLimit(userKey(user.id, "razorpay-create"), 10, 60_000, "razorpay-create");
  if (!uLimit.ok) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(uLimit.retryAfter / 1000)) } },
    );
  }

  // Role check: only customers should initiate payments
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_active === false) {
    return NextResponse.json({ error: "Account is not active", code: "ACCOUNT_INACTIVE" }, { status: 403 });
  }
  if (profile.role !== "customer") {
    return NextResponse.json({ error: "Only customers can initiate payments", code: "FORBIDDEN" }, { status: 403 });
  }

  // ── COD gate: Razorpay keys must be present ──────────────────────────────
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Online payments are not configured" },
      { status: 503 },
    );
  }

  // ── Load order (ownership enforced by customer_id filter — DB predicate) ─
  const admin = getAdminSupabase();
  const { data: order, error: orderError } = await getOrderForPayment(admin, orderId, user.id);
  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // ── State guard: only awaiting-payment orders may proceed ────────────────
  if (order.order_status !== "awaiting_payment") {
    return NextResponse.json(
      { error: "Order is not eligible for payment", code: "INVALID_ORDER_STATE" },
      { status: 409 },
    );
  }
  if (order.payment_status === "paid") {
    return NextResponse.json(
      { error: "Order is already paid", code: "ALREADY_PAID" },
      { status: 409 },
    );
  }

  // ── Staleness guard ──────────────────────────────────────────────────────
  const orderAge = Date.now() - new Date(order.created_at).getTime();
  if (orderAge > ORDER_STALENESS_MS) {
    return NextResponse.json(
      { error: "Order has expired. Please create a new order.", code: "ORDER_EXPIRED" },
      { status: 410 },
    );
  }

  // ── Idempotent re-entry: if Razorpay order already exists, return it ────
  if (order.razorpay_order_id) {
    const amountPaise = Math.round(Number(order.total_amount) * 100);
    return NextResponse.json({
      id: order.razorpay_order_id,
      amount: amountPaise,
      currency: "INR",
    });
  }

  // ── Create Razorpay order using STORED total (never recompute) ───────────
  const amountPaise = Math.round(Number(order.total_amount) * 100);
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const razorpayOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: orderId,
  });

  // ── Persist Razorpay order ID ──────────────────────────────────────────
  const { error: updateError } = await setRazorpayOrderId(admin, orderId, razorpayOrder.id);
  if (updateError) {
    logServerError("payments.create_order_persist_failed", updateError, { orderId });
    return NextResponse.json({ error: "Could not reserve payment" }, { status: 500 });
  }

  return NextResponse.json({
    id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  });
}

export async function POST(req: Request) {
  try {
    return await withTimeout(handler(req));
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    // Never log secrets. Log only the order-level context.
    logServerError("payments.create_order_unexpected_error", error);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
