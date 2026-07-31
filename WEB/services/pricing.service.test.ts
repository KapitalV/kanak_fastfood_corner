import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PricingData, PricingRepository } from "../repositories/pricing.repo";
import { priceCart, PricingError, type OrderRequest } from "./pricing.service";

const baseInput = (): OrderRequest => ({
  addressId: "11111111-1111-4111-8111-111111111111",
  paymentMethod: "cod",
  tip: 0,
  instructions: "",
  items: [{ productId: "22222222-2222-4222-8222-222222222222", quantity: 1, addonIds: [] }],
});

const baseData = (): PricingData => ({
  address: { id: "11111111-1111-4111-8111-111111111111", full_address: "1 Test Road", flat_no: null, landmark: null, lat: null, lng: null, delivery_instructions: null },
  products: [{ id: "22222222-2222-4222-8222-222222222222", restaurant_id: "33333333-3333-4333-8333-333333333333", name: "Test meal", price: 100, image_url: null, is_available: true }],
  restaurants: [{ id: "33333333-3333-4333-8333-333333333333", name: "Test Restaurant", delivery_fee: 35, packaging_charge: 10, min_order_amount: 0, is_open: true, is_approved: true }],
  variants: [{ id: "44444444-4444-4444-8444-444444444444", product_id: "22222222-2222-4222-8222-222222222222", name: "Large", price_delta: 10, is_available: true }],
  addons: [{ id: "55555555-5555-4555-8555-555555555555", restaurant_id: "33333333-3333-4333-8333-333333333333", name: "Extra sauce", price: 5, is_available: true }],
  addonLinks: [{ product_variant_id: "44444444-4444-4444-8444-444444444444", product_addon_id: "55555555-5555-4555-8555-555555555555" }],
  coupon: null,
});

const repository = (data: PricingData): PricingRepository => ({ load: async () => data });
const coupon = (overrides: Record<string, unknown> = {}) => ({
  id: "66666666-6666-4666-8666-666666666666", discount_type: "flat", discount_value: 20,
  min_order_amount: 0, max_discount: null, max_uses: null, used_count: 0,
  valid_from: "2020-01-01T00:00:00.000Z", valid_until: "2030-01-01T00:00:00.000Z",
  restaurant_id: null, is_active: true, ...overrides,
});

describe("priceCart", () => {
  it("prices a flat coupon from database values", async () => {
    const data = baseData(); data.coupon = coupon();
    const result = await priceCart(repository(data), { ...baseInput(), couponCode: "FLAT20" }, "user-1");
    assert.equal(result.subtotal, 100);
    assert.equal(result.discount, 20);
    assert.equal(result.total, 135);
  });

  it("prices a percentage coupon and obeys its cap", async () => {
    const data = baseData(); data.coupon = coupon({ discount_type: "percent", discount_value: 30, max_discount: 25 });
    const result = await priceCart(repository(data), { ...baseInput(), couponCode: "PERCENT30" }, "user-1");
    assert.equal(result.discount, 25);
    assert.equal(result.total, 130);
  });

  it("rejects a coupon below its minimum order", async () => {
    const data = baseData(); data.coupon = coupon({ min_order_amount: 150 });
    await assert.rejects(() => priceCart(repository(data), { ...baseInput(), couponCode: "MIN150" }, "user-1"), (error: unknown) => error instanceof PricingError && error.code === "COUPON_MIN_ORDER");
  });

  it("rejects an expired coupon", async () => {
    const data = baseData(); data.coupon = coupon({ valid_until: "2020-01-02T00:00:00.000Z" });
    await assert.rejects(() => priceCart(repository(data), { ...baseInput(), couponCode: "OLD" }, "user-1"), (error: unknown) => error instanceof PricingError && error.code === "COUPON_EXPIRED");
  });

  it("includes tip, multi-quantity variants, and linked add-ons", async () => {
    const input = baseInput();
    input.tip = 7;
    input.items[0] = { ...input.items[0], quantity: 2, variantId: "44444444-4444-4444-8444-444444444444", addonIds: ["55555555-5555-4555-8555-555555555555"] };
    const result = await priceCart(repository(baseData()), input, "user-1");
    assert.equal(result.lines[0].unitPrice, 115);
    assert.equal(result.subtotal, 230);
    assert.equal(result.tip, 7);
    assert.equal(result.total, 298.5);
  });

  it("ignores a manipulated client total", async () => {
    const manipulated = { ...baseInput(), total: 1, subtotal: 1 } as OrderRequest & { total: number; subtotal: number };
    const result = await priceCart(repository(baseData()), manipulated, "user-1");
    assert.equal(result.total, 155);
    assert.notEqual(result.total, manipulated.total);
  });
});
