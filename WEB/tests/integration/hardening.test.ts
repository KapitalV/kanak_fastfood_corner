import { createHmac, randomUUID } from "node:crypto";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const env = process.env;
const enabled = Boolean(env.INTEGRATION_BASE_URL && env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY && env.INTEGRATION_CUSTOMER_EMAIL && env.INTEGRATION_CUSTOMER_PASSWORD && env.INTEGRATION_SECOND_CUSTOMER_EMAIL && env.INTEGRATION_SECOND_CUSTOMER_PASSWORD && env.INTEGRATION_STORE_EMAIL && env.INTEGRATION_STORE_PASSWORD && env.INTEGRATION_DELIVERY_EMAIL && env.INTEGRATION_DELIVERY_PASSWORD && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET);
const run = `itest-${randomUUID()}`;
let admin: SupabaseClient;
let customer: Account, otherCustomer: Account, store: Account, delivery: Account;
const created = { orders: [] as string[], restaurants: [] as string[], addresses: [] as string[], coupons: [] as string[] };

type Account = { id: string; session: Session; cookie: string };
type Fixture = { restaurantId: string; productId: string; secondProductId: string; customerAddressId: string; otherAddressId: string };
const total = 155;
const orderStates = ["awaiting_payment", "placed", "preparing", "ready", "assigned", "accepted", "picked", "in_transit", "delivered", "cancelled"];
const allowed: Record<string, string[]> = { awaiting_payment: ["placed", "cancelled"], placed: ["preparing", "cancelled"], preparing: ["ready"], ready: ["assigned"], assigned: ["picked"], picked: ["in_transit"], in_transit: ["delivered"], accepted: [], delivered: [], cancelled: [] };

function cookie(session: Session) {
  const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}
async function signIn(email: string, password: string): Promise<Account> {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw error ?? new Error(`Unable to sign in ${email}`);
  return { id: data.user.id, session: data.session, cookie: cookie(data.session) };
}
function userClient(account: Account) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${account.session.access_token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}
async function api(path: string, account: Account, body: unknown, headers: Record<string, string> = {}) {
  return fetch(new URL(path, env.INTEGRATION_BASE_URL), { method: "POST", headers: { cookie: account.cookie, "content-type": "application/json", "x-forwarded-for": `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...headers }, body: JSON.stringify(body) });
}
function input(f: Fixture, addressId = f.customerAddressId, productId = f.productId, extra: Record<string, unknown> = {}) {
  return { addressId, paymentMethod: "cod", tip: 0, instructions: "integration", items: [{ productId, quantity: 1, addonIds: [] }], ...extra };
}
async function fixture(): Promise<Fixture> {
  const restaurant = await admin.from("restaurants").insert({ owner_id: store.id, name: `${run}-restaurant-${created.restaurants.length}`, address: "1 Integration Street", is_open: true, is_approved: true, delivery_fee: 35, packaging_charge: 10 }).select("id").single();
  if (restaurant.error || !restaurant.data) throw restaurant.error;
  created.restaurants.push(restaurant.data.id);
  const second = await admin.from("restaurants").insert({ owner_id: store.id, name: `${run}-second-${created.restaurants.length}`, address: "2 Integration Street", is_open: true, is_approved: true }).select("id").single();
  if (second.error || !second.data) throw second.error;
  created.restaurants.push(second.data.id);
  const products = await admin.from("products").insert([{ restaurant_id: restaurant.data.id, name: "Integration meal", price: 100, is_available: true }, { restaurant_id: second.data.id, name: "Other restaurant meal", price: 100, is_available: true }]).select("id,restaurant_id");
  if (products.error || !products.data) throw products.error;
  const addresses = await admin.from("addresses").insert([{ user_id: customer.id, label: "Home", full_address: "1 Customer Integration Road" }, { user_id: otherCustomer.id, label: "Home", full_address: "2 Customer Integration Road" }]).select("id,user_id");
  if (addresses.error || !addresses.data) throw addresses.error;
  created.addresses.push(...addresses.data.map((row) => row.id));
  return { restaurantId: restaurant.data.id, productId: products.data.find((row) => row.restaurant_id === restaurant.data.id)!.id, secondProductId: products.data.find((row) => row.restaurant_id === second.data.id)!.id, customerAddressId: addresses.data.find((row) => row.user_id === customer.id)!.id, otherAddressId: addresses.data.find((row) => row.user_id === otherCustomer.id)!.id };
}
async function paymentOrder(f: Fixture, owner = customer) {
  const razorpayOrderId = `order_${randomUUID().replaceAll("-", "")}`;
  const result = await admin.from("orders").insert({ customer_id: owner.id, restaurant_id: f.restaurantId, total_amount: total, subtotal: 100, delivery_fee: 35, tax_amount: 5, packaging_charge: 10, platform_fee: 5, tip_amount: 0, payment_method: "razorpay", payment_status: "razorpay", order_status: "awaiting_payment", delivery_address: "Integration delivery address", razorpay_order_id: razorpayOrderId, idempotency_key: `${run}-${randomUUID()}` }).select("id").single();
  if (result.error || !result.data) throw result.error;
  created.orders.push(result.data.id);
  return { id: result.data.id, razorpayOrderId };
}
function callback(order: { id: string; razorpayOrderId: string }, paymentId = `pay_${randomUUID().replaceAll("-", "")}`) {
  const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET!).update(`${order.razorpayOrderId}|${paymentId}`).digest("hex");
  return { orderId: order.id, razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature };
}
async function webhook(order: { id: string; razorpayOrderId: string }, paymentId: string, amount = total * 100) {
  const raw = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: order.razorpayOrderId, amount, status: "captured" } } } });
  const signature = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET!).update(raw).digest("hex");
  return fetch(new URL("/api/webhooks/razorpay", env.INTEGRATION_BASE_URL), { method: "POST", headers: { "content-type": "application/json", "x-razorpay-signature": signature }, body: raw });
}
async function orderRow(id: string) { const row = await admin.from("orders").select("payment_status,order_status,total_amount,razorpay_payment_id").eq("id", id).single(); if (row.error || !row.data) throw row.error; return row.data; }

describe.skipIf(!enabled)("real order, payment, state, and RLS integration", () => {
  beforeAll(async () => {
    admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    [customer, otherCustomer, store, delivery] = await Promise.all([signIn(env.INTEGRATION_CUSTOMER_EMAIL!, env.INTEGRATION_CUSTOMER_PASSWORD!), signIn(env.INTEGRATION_SECOND_CUSTOMER_EMAIL!, env.INTEGRATION_SECOND_CUSTOMER_PASSWORD!), signIn(env.INTEGRATION_STORE_EMAIL!, env.INTEGRATION_STORE_PASSWORD!), signIn(env.INTEGRATION_DELIVERY_EMAIL!, env.INTEGRATION_DELIVERY_PASSWORD!)]);
    const profiles = await admin.from("profiles").select("id,role,is_active").in("id", [customer.id, otherCustomer.id, store.id, delivery.id]);
    if (profiles.error || profiles.data?.length !== 4) throw profiles.error ?? new Error("Integration accounts need profiles");
    for (const [account, role] of [[customer, "customer"], [otherCustomer, "customer"], [store, "store"], [delivery, "delivery"]] as const) {
      const profile = profiles.data.find((row) => row.id === account.id);
      if (profile?.role !== role || profile.is_active === false) throw new Error(`Integration account ${role} must be active with role ${role}`);
    }
  });
  afterEach(async () => {
    for (const orderId of created.orders) await admin.from("notifications").delete().contains("data", { order_id: orderId });
    if (created.orders.length) await admin.from("orders").delete().in("id", created.orders);
    if (created.addresses.length) await admin.from("addresses").delete().in("id", created.addresses);
    if (created.coupons.length) await admin.from("coupons").delete().in("id", created.coupons);
    if (created.restaurants.length) await admin.from("restaurants").delete().in("id", created.restaurants);
    created.orders.length = 0; created.addresses.length = 0; created.restaurants.length = 0; created.coupons.length = 0;
  });

  it("creates orders from server pricing and rejects client/cart ownership attacks", async () => {
    const f = await fixture();
    const happy = await api("/api/orders", customer, input(f), { "Idempotency-Key": `${run}-happy` });
    const happyBody = await happy.json(); expect(happy.status).toBe(200); expect(happyBody.total).toBe(total); created.orders.push(happyBody.order.id);
    const tampered = await api("/api/orders", customer, input(f, f.customerAddressId, f.productId, { total: 1, subtotal: 1 }), { "Idempotency-Key": `${run}-tampered` });
    const tamperedBody = await tampered.json(); expect(tampered.status).toBe(200); expect(tamperedBody.total).toBe(total); created.orders.push(tamperedBody.order.id);
    const mixed = await api("/api/orders", customer, { ...input(f), items: [{ productId: f.productId, quantity: 1, addonIds: [] }, { productId: f.secondProductId, quantity: 1, addonIds: [] }] }, { "Idempotency-Key": `${run}-mixed` }); expect((await mixed.json()).code).toBe("MULTIPLE_RESTAURANTS");
    await admin.from("products").update({ is_available: false }).eq("id", f.productId);
    const unavailable = await api("/api/orders", customer, input(f), { "Idempotency-Key": `${run}-unavailable` }); expect((await unavailable.json()).code).toBe("PRODUCT_UNAVAILABLE");
    await admin.from("products").update({ is_available: true }).eq("id", f.productId);
    const foreign = await api("/api/orders", customer, input(f, f.otherAddressId), { "Idempotency-Key": `${run}-foreign-address` }); expect((await foreign.json()).code).toBe("ADDRESS_NOT_OWNED");
  });

  it("makes idempotency and limited coupons race-safe", async () => {
    const f = await fixture(); const key = `${run}-same-key`;
    const [one, two] = await Promise.all([api("/api/orders", customer, input(f), { "Idempotency-Key": key }), api("/api/orders", customer, input(f), { "Idempotency-Key": key })]);
    const oneBody = await one.json(); const twoBody = await two.json(); expect(one.status).toBe(200); expect(two.status).toBe(200); expect(oneBody.order.id).toBe(twoBody.order.id); created.orders.push(oneBody.order.id);
    const coupon = await admin.from("coupons").insert({ code: `${run.slice(-8)}-ONE`, description: "integration", discount_type: "flat", discount_value: 10, max_uses: 1, is_active: true }).select("id,code").single(); if (coupon.error || !coupon.data) throw coupon.error; created.coupons.push(coupon.data.id);
    const first = api("/api/orders", customer, input(f, f.customerAddressId, f.productId, { couponCode: coupon.data.code }), { "Idempotency-Key": `${run}-coupon-a` });
    const second = api("/api/orders", otherCustomer, input(f, f.otherAddressId, f.productId, { couponCode: coupon.data.code }), { "Idempotency-Key": `${run}-coupon-b` });
    const responses = await Promise.all([first, second]); const bodies = await Promise.all(responses.map((response) => response.json())); expect(responses.filter((response) => response.status === 200)).toHaveLength(1); expect(bodies.filter((body) => body.code === "COUPON_USAGE_LIMIT")).toHaveLength(1);
    for (const body of bodies) if (body.order?.id) created.orders.push(body.order.id);
    const used = await admin.from("coupons").select("used_count").eq("id", coupon.data.id).single(); expect(used.data?.used_count).toBe(1);
  });

  it("handles payment replay, concurrency, tampering, ownership, and callback/webhook ordering", async () => {
    const f = await fixture();
    const replay = await paymentOrder(f); const replayPayment = `pay_${randomUUID().replaceAll("-", "")}`; expect((await webhook(replay, replayPayment)).status).toBe(200); expect((await webhook(replay, replayPayment)).status).toBe(200); expect((await orderRow(replay.id)).payment_status).toBe("paid"); const replayEvents = await admin.from("payment_events").select("id", { count: "exact", head: true }).eq("order_id", replay.id); expect(replayEvents.count).toBe(1);
    const concurrent = await paymentOrder(f); const concurrentPayload = callback(concurrent); const verifyResponses = await Promise.all([api("/api/razorpay/verify-payment", customer, concurrentPayload), api("/api/razorpay/verify-payment", customer, concurrentPayload)]); expect(verifyResponses.every((response) => response.status === 200)).toBe(true); expect((await orderRow(concurrent.id)).payment_status).toBe("paid");
    const tampered = await paymentOrder(f); expect((await webhook(tampered, `pay_${randomUUID().replaceAll("-", "")}`, 1)).status).toBe(500); expect((await orderRow(tampered.id)).payment_status).toBe("razorpay");
    const foreign = await paymentOrder(f); expect((await api("/api/razorpay/verify-payment", otherCustomer, callback(foreign))).status).toBe(404); expect((await orderRow(foreign.id)).payment_status).toBe("razorpay");
    const callbackFirst = await paymentOrder(f); const callbackFirstPayload = callback(callbackFirst); expect((await api("/api/razorpay/verify-payment", customer, callbackFirstPayload)).status).toBe(200); expect((await webhook(callbackFirst, callbackFirstPayload.razorpay_payment_id)).status).toBe(200);
    const webhookFirst = await paymentOrder(f); const webhookFirstPayload = callback(webhookFirst); expect((await webhook(webhookFirst, webhookFirstPayload.razorpay_payment_id)).status).toBe(200); expect((await api("/api/razorpay/verify-payment", customer, webhookFirstPayload)).status).toBe(200);
    const a = await orderRow(callbackFirst.id), b = await orderRow(webhookFirst.id); expect({ payment_status: a.payment_status, order_status: a.order_status, total_amount: a.total_amount }).toEqual({ payment_status: b.payment_status, order_status: b.order_status, total_amount: b.total_amount });
  });

  it("rejects every invalid persisted order transition and enforces the RLS matrix", async () => {
    const f = await fixture();
    for (const from of orderStates) for (const to of orderStates) if (from !== to && !allowed[from].includes(to)) {
      const inserted = await admin.from("orders").insert({ customer_id: customer.id, restaurant_id: f.restaurantId, total_amount: total, subtotal: 100, delivery_fee: 35, tax_amount: 5, packaging_charge: 10, platform_fee: 5, payment_method: "cod", payment_status: "pending", order_status: from, delivery_address: "Integration state test", idempotency_key: `${run}-${from}-${to}-${randomUUID()}` }).select("id").single(); if (inserted.error || !inserted.data) throw inserted.error; created.orders.push(inserted.data.id); const update = await admin.from("orders").update({ order_status: to }).eq("id", inserted.data.id); expect(update.error, `${from} -> ${to}`).not.toBeNull();
    }
    const other = userClient(otherCustomer); const own = userClient(customer);
    const hiddenAddress = await other.from("addresses").select("id").eq("id", f.customerAddressId); expect(hiddenAddress.data).toHaveLength(0);
    const deniedWrite = await other.from("addresses").update({ full_address: "Unauthorized change" }).eq("id", f.customerAddressId).select(); expect(deniedWrite.data).toHaveLength(0);
    const directOrder = await paymentOrder(f); const moneyWrite = await own.from("orders").update({ total_amount: 1 }).eq("id", directOrder.id); expect(moneyWrite.error).not.toBeNull();
    const hiddenEvents = await own.from("payment_events").select("id").eq("order_id", directOrder.id); expect(hiddenEvents.data).toHaveLength(0);
  });
});
