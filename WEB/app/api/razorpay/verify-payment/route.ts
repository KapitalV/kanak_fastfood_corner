import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import { verifyPaymentSchema } from "@/utils/validation";
import { getOrderForPayment, finalizePayment } from "@/repositories/payments.repo";
import { logServerError } from "@/lib/server-logger";

export async function POST(req: Request) {
  try {
    // ── Rate limit ───────────────────────────────────────────────────────────
    const limit = await rateLimit(requestKey(req, "razorpay-verify"), 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many payment attempts" }, { status: 429 });
    }

    // ── Validate input ───────────────────────────────────────────────────────
    const parsed = verifyPaymentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = parsed.data;

    // ── COD gate: secret must be present ─────────────────────────────────────
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Online payments are not configured" }, { status: 503 });
    }

    // ── Authenticate ─────────────────────────────────────────────────────────
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // ── Load order (ownership enforced) ──────────────────────────────────────
    const admin = getAdminSupabase();
    const { data: order, error: orderError } = await getOrderForPayment(admin, orderId, user.id);
    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── Razorpay order ID must match the stored value ────────────────────────
    if (order.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ error: "Payment order mismatch" }, { status: 400 });
    }

    // ── Constant-time HMAC verification (never use ===) ──────────────────────
    const expectedDigest = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest();

    const receivedDigest = Buffer.from(razorpay_signature, "hex");

    if (
      expectedDigest.length !== receivedDigest.length ||
      !crypto.timingSafeEqual(expectedDigest, receivedDigest)
    ) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // ── Finalize via transactional RPC ───────────────────────────────────────
    // Amount comes from DB, never from the client.
    const amountPaise = Math.round(Number(order.total_amount) * 100);

    const { error: rpcError } = await finalizePayment(admin, {
      orderId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaise,
      providerEventId: `verify:${razorpay_payment_id}`,
      eventType: "payment.verified",
      eventPayload: { source: "client_callback" },
      notificationUserId: user.id,
      notificationTitle: "Payment Confirmed",
      notificationBody: "Your payment has been confirmed and your order is now being processed.",
    });

    if (rpcError) {
      // Unique violation on payment_events.provider_event_id — idempotent
      // duplicate from a concurrent verify call or a webhook that won the race.
      if (rpcError.code === "23505") {
        return NextResponse.json({ verified: true, alreadyProcessed: true });
      }
      logServerError("payments.verify_finalize_failed", rpcError, { orderId });
      return NextResponse.json({ error: "Could not finalize payment" }, { status: 500 });
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    // Never log signatures or secrets.
    logServerError("payments.verify_unexpected_error", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
