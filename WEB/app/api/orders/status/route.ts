import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleAuthError, enforceBodyLimit, withTimeout } from "@/lib/auth";
import { rateLimit, requestKey, userKey } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-logger";

const schema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["preparing", "ready", "assigned", "accepted", "picked", "in_transit", "delivered"]),
  deliveryBoyId: z.string().uuid().optional(),
});

const storeTransitions: Record<string, string[]> = { awaiting_payment: ["placed"], placed: ["preparing"], preparing: ["ready"] };
const deliveryTransitions: Record<string, string[]> = {
  assigned: ["accepted"], accepted: ["picked"], picked: ["in_transit"], in_transit: ["delivered"],
};
const orderStatusForTask: Record<string, string> = {
  accepted: "assigned", picked: "picked", in_transit: "in_transit", delivered: "delivered",
};

async function handler(request: Request) {
  // ── Body size guard ──────────────────────────────────────────────────────
  const bodyGuard = enforceBodyLimit(request);
  if (bodyGuard) return bodyGuard;

  // ── Rate limit (IP) ──────────────────────────────────────────────────────
  const ipLimit = await rateLimit(requestKey(request, "order-status"), 30, 60_000, "order-status");
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ipLimit.retryAfter / 1000)) } },
    );
  }

  // ── Validate input ───────────────────────────────────────────────────────
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid order update" }, { status: 400 });

  // ── Authenticate + authorize role ────────────────────────────────────────
  const { user, supabase, role } = await requireRole("store", "delivery", "admin");

  // Per-user rate limit
  const uLimit = await rateLimit(userKey(user.id, "order-status"), 30, 60_000, "order-status");
  if (!uLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(uLimit.retryAfter / 1000)) } },
    );
  }

  const { orderId, status, deliveryBoyId } = parsed.data;

  // ── Load order with ownership check via DB predicate ─────────────────────
  // The query filters by role-appropriate ownership so the DB is the authority.
  const { data: order } = await supabase.from("orders")
    .select("id,restaurant_id,order_status,delivery_boy_id,restaurants!inner(owner_id)")
    .eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // ── Store or admin assigning a delivery person ───────────────────────────
  if ((role === "store" || role === "admin") && status === "assigned" && deliveryBoyId) {
    // DB-level ownership: store owner must own the restaurant
    if (role === "store") {
      const { data: owned } = await supabase.from("restaurants")
        .select("id")
        .eq("id", order.restaurant_id)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!owned) return NextResponse.json({ error: "Order update is not allowed" }, { status: 403 });
    }

    const { data: delivery } = await supabase.from("profiles").select("id,role,is_active").eq("id", deliveryBoyId).single();
    if (!delivery || delivery.role !== "delivery" || delivery.is_active === false) return NextResponse.json({ error: "Delivery account is not eligible" }, { status: 400 });
    if (order.order_status !== "ready") return NextResponse.json({ error: "Order is not ready for assignment" }, { status: 409 });
    const { error: taskError } = await supabase.from("delivery_tasks").insert({ order_id: orderId, delivery_boy_id: deliveryBoyId, status: "assigned" });
    if (taskError) throw taskError;
    const { error } = await supabase.from("orders").update({ delivery_boy_id: deliveryBoyId, order_status: "assigned" }).eq("id", orderId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  }

  // ── Store status transitions ─────────────────────────────────────────────
  if (role === "store") {
    // DB-level ownership check: verify store owner owns this restaurant
    const { data: owned } = await supabase.from("restaurants")
      .select("id")
      .eq("id", order.restaurant_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owned || !storeTransitions[order.order_status]?.includes(status)) {
      return NextResponse.json({ error: "Order update is not allowed" }, { status: 403 });
    }
    const { error } = await supabase.from("orders").update({ order_status: status }).eq("id", orderId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  }

  // ── Delivery status transitions ──────────────────────────────────────────
  if (role === "delivery") {
    // DB-level ownership check: delivery person must be assigned to this order
    const { data: assignedOrder } = await supabase.from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("delivery_boy_id", user.id)
      .maybeSingle();
    if (!assignedOrder || !deliveryTransitions[order.order_status]?.includes(status)) {
      return NextResponse.json({ error: "Order update is not allowed" }, { status: 403 });
    }

    const { data: task } = await supabase.from("delivery_tasks").select("id,status")
      .eq("order_id", orderId).eq("delivery_boy_id", user.id).single();
    if (!task || task.status !== order.order_status) return NextResponse.json({ error: "Delivery task not found" }, { status: 409 });
    const stamps: Record<string, string> = {};
    if (status === "accepted") stamps.accepted_at = new Date().toISOString();
    if (status === "picked") stamps.picked_at = new Date().toISOString();
    if (status === "delivered") stamps.delivered_at = new Date().toISOString();
    const { error: taskError } = await supabase.from("delivery_tasks").update({ status: status === "accepted" ? "accepted" : status, ...stamps }).eq("id", task.id);
    if (taskError) throw taskError;
    const { error: orderError } = await supabase.from("orders").update({ order_status: orderStatusForTask[status] }).eq("id", orderId);
    if (orderError) throw orderError;
    return NextResponse.json({ success: true });
  }

  // ── Admin status transitions ─────────────────────────────────────────────
  if (role === "admin") {
    // Admin can perform any store transition
    if (storeTransitions[order.order_status]?.includes(status)) {
      const { error } = await supabase.from("orders").update({ order_status: status }).eq("id", orderId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: "Order update is not allowed" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    return await withTimeout(handler(request));
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    logServerError("orders.status_update_failed", error);
    return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }
}
