import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import {
  getOrderByRazorpayOrderId,
  finalizePayment,
  recordPaymentEvent,
  updatePaymentStatus,
} from "@/repositories/payments.repo";
import { logServerError, logServerEvent } from "@/lib/server-logger";

// ─── Signature verification ──────────────────────────────────────────────────

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest();
  const received = Buffer.from(signature, "hex");
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

// ─── Razorpay event type definitions ─────────────────────────────────────────

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
}

interface RazorpayRefundEntity {
  id?: string;
  payment_id?: string;
  amount?: number;
}

interface RazorpayWebhookEvent {
  event?: string;
  account_id?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: RazorpayRefundEntity };
    dispute?: { entity?: { id?: string; payment_id?: string } };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a stable, unique provider_event_id for idempotency.
 * Format: "webhook:{event_type}:{entity_id}"
 */
function buildProviderEventId(eventType: string, entityId: string): string {
  return `webhook:${eventType}:${entityId}`;
}

/**
 * Safe payload for audit logging — strips any card/sensitive fields.
 * Only keeps structural event metadata.
 */
function safeAuditPayload(event: RazorpayWebhookEvent): Record<string, unknown> {
  return {
    event: event.event,
    account_id: event.account_id,
    // Never store card data, signatures, or full entity payloads
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Read raw body BEFORE parsing (signature must be verified on raw text) ──
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature");
  if (!secret || !signature) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  // ── Parse after verification ───────────────────────────────────────────────
  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event;
  if (!eventType) {
    // Unknown structure — return 200 so Razorpay stops retrying.
    return NextResponse.json({ received: true });
  }

  // Log event type only, never payload data that may contain card information.
  logServerEvent("payments.webhook_received", { eventType });

  const admin = getAdminSupabase();

  try {
    // ── payment.captured ─────────────────────────────────────────────────────
    if (eventType === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment.id) {
        return NextResponse.json({ received: true });
      }

      const { data: order } = await getOrderByRazorpayOrderId(admin, payment.order_id);
      if (!order) {
        // Order not found — may be from a different system. Acknowledge.
        logServerEvent("payments.webhook_order_not_found", { eventType });
        return NextResponse.json({ received: true });
      }

      // Already paid — idempotent success.
      if (order.payment_status === "paid") {
        return NextResponse.json({ received: true });
      }

      const providerEventId = buildProviderEventId(eventType, payment.id);
      const amountPaise = payment.amount ?? Math.round(Number(order.total_amount) * 100);

      const { error: rpcError } = await finalizePayment(admin, {
        orderId: order.id,
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
        amountPaise,
        providerEventId,
        eventType,
        eventPayload: safeAuditPayload(event),
        notificationUserId: order.customer_id,
        notificationTitle: "Payment Confirmed",
        notificationBody: "Your payment has been confirmed and your order is now being processed.",
      });

      if (rpcError) {
        // Unique violation — the verify callback already finalized. Idempotent.
        if (rpcError.code === "23505") {
          return NextResponse.json({ received: true });
        }
        logServerError("payments.webhook_finalize_failed", rpcError, { eventType, orderId: order.id });
        // Return 500 so Razorpay retries.
        return NextResponse.json({ error: "Processing error" }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    // ── payment.failed ───────────────────────────────────────────────────────
    if (eventType === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment.id) {
        return NextResponse.json({ received: true });
      }

      const { data: order } = await getOrderByRazorpayOrderId(admin, payment.order_id);
      if (!order) {
        return NextResponse.json({ received: true });
      }

      // Don't downgrade a paid order to failed.
      if (order.payment_status === "paid") {
        return NextResponse.json({ received: true });
      }

      const providerEventId = buildProviderEventId(eventType, payment.id);
      const eventResult = await recordPaymentEvent(admin, order.id, providerEventId, eventType, safeAuditPayload(event));

      if (eventResult.inserted) {
        await updatePaymentStatus(admin, order.id, "failed");
      }
      // Duplicate (already recorded) — idempotent 200.
      return NextResponse.json({ received: true });
    }

    // ── refund.processed ─────────────────────────────────────────────────────
    if (eventType === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      const payment = event.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;

      if (!razorpayOrderId || !refund?.id) {
        return NextResponse.json({ received: true });
      }

      const { data: order } = await getOrderByRazorpayOrderId(admin, razorpayOrderId);
      if (!order) {
        return NextResponse.json({ received: true });
      }

      const providerEventId = buildProviderEventId(eventType, refund.id);
      const eventResult = await recordPaymentEvent(admin, order.id, providerEventId, eventType, safeAuditPayload(event));

      if (eventResult.inserted) {
        await updatePaymentStatus(admin, order.id, "refunded");
      }
      return NextResponse.json({ received: true });
    }

    // ── dispute.* ────────────────────────────────────────────────────────────
    if (eventType.startsWith("dispute.")) {
      const dispute = event.payload?.dispute?.entity;
      const disputeId = dispute?.id ?? "unknown";

      // Try to find the order via the payment entity if present.
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        const { data: order } = await getOrderByRazorpayOrderId(admin, payment.order_id);
        if (order) {
          const providerEventId = buildProviderEventId(eventType, disputeId);
          // Audit trail only — do not change order status for disputes.
          await recordPaymentEvent(admin, order.id, providerEventId, eventType, safeAuditPayload(event));
        }
      }
      return NextResponse.json({ received: true });
    }

    // ── All other events: intentionally ignore ───────────────────────────────
    // Return 200 so Razorpay stops retrying for events we don't handle.
    return NextResponse.json({ received: true });
  } catch (error) {
    logServerError("payments.webhook_unexpected_error", error, { eventType });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
