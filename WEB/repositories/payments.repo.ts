import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Query helpers for the payment flow ──────────────────────────────────────
// All queries use the admin (service-role) client so they bypass RLS.

const PAYMENT_ORDER_FIELDS =
  "id, customer_id, total_amount, payment_status, order_status, razorpay_order_id, razorpay_payment_id, created_at" as const;

/** Load an order for payment, scoped to a specific customer. */
export async function getOrderForPayment(
  admin: SupabaseClient,
  orderId: string,
  customerId: string,
) {
  return admin
    .from("orders")
    .select(PAYMENT_ORDER_FIELDS)
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .single();
}

/** Load an order by its Razorpay order ID (webhook path — no customer filter). */
export async function getOrderByRazorpayOrderId(
  admin: SupabaseClient,
  razorpayOrderId: string,
) {
  return admin
    .from("orders")
    .select(PAYMENT_ORDER_FIELDS)
    .eq("razorpay_order_id", razorpayOrderId)
    .single();
}

/** Persist the Razorpay order ID after creating the Razorpay order. */
export async function setRazorpayOrderId(
  admin: SupabaseClient,
  orderId: string,
  razorpayOrderId: string,
) {
  return admin
    .from("orders")
    .update({ razorpay_order_id: razorpayOrderId, payment_status: "razorpay" })
    .eq("id", orderId);
}

/** Call the transactional finalize_payment RPC. */
export async function finalizePayment(
  admin: SupabaseClient,
  params: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    amountPaise: number;
    providerEventId: string;
    eventType: string;
    eventPayload?: Record<string, unknown>;
    notificationUserId?: string;
    notificationTitle?: string;
    notificationBody?: string;
  },
) {
  return admin.rpc("finalize_payment", {
    p_order_id: params.orderId,
    p_razorpay_order_id: params.razorpayOrderId,
    p_razorpay_payment_id: params.razorpayPaymentId,
    p_amount_paise: params.amountPaise,
    p_provider_event_id: params.providerEventId,
    p_event_type: params.eventType,
    p_event_payload: params.eventPayload ?? {},
    p_notification_user_id: params.notificationUserId ?? null,
    p_notification_title: params.notificationTitle ?? "Payment Confirmed",
    p_notification_body:
      params.notificationBody ??
      "Your payment has been confirmed and your order is now being processed.",
  });
}

/**
 * Insert a payment_events row for audit/idempotency.
 * Returns `{ inserted: true }` on success, `{ inserted: false }` if the
 * provider_event_id already exists (unique violation 23505).
 */
export async function recordPaymentEvent(
  admin: SupabaseClient,
  orderId: string,
  providerEventId: string,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<{ inserted: boolean; error?: string }> {
  const { error } = await admin
    .from("payment_events")
    .insert({ order_id: orderId, provider_event_id: providerEventId, type, payload });

  if (error) {
    // Unique violation on provider_event_id — idempotent duplicate.
    if (error.code === "23505") return { inserted: false };
    return { inserted: false, error: error.message };
  }
  return { inserted: true };
}

/** Simple status update for webhook failure/refund paths. */
export async function updatePaymentStatus(
  admin: SupabaseClient,
  orderId: string,
  paymentStatus: string,
  extraFields?: Record<string, unknown>,
) {
  return admin
    .from("orders")
    .update({ payment_status: paymentStatus, ...extraFields })
    .eq("id", orderId);
}
