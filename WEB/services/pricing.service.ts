import { z } from "zod";
import type { PricingData, PricingRepository } from "../repositories/pricing.repo";

const GST_RATE = 0.05;
const PLATFORM_FEE = 5;
const FREE_DELIVERY_ABOVE = 299;
export const PER_ITEM_CAP = 10;

export const orderRequestSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(["cod", "razorpay"]),
  tip: z.number().finite().optional().default(0),
  instructions: z.string().trim().max(500).optional().default(""),
  couponCode: z.string().trim().max(40).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int(),
    variantId: z.string().uuid().optional(),
    addonIds: z.array(z.string().uuid()).optional().default([]),
  }).superRefine((item, context) => {
    if (new Set(item.addonIds).size !== item.addonIds.length) context.addIssue({ code: "custom", message: "Duplicate add-ons are not allowed" });
  })).min(1).max(50),
});

export type OrderRequest = z.infer<typeof orderRequestSchema>;
export type PricingErrorCode =
  | "INVALID_QUANTITY"
  | "PRODUCT_UNAVAILABLE"
  | "MULTIPLE_RESTAURANTS"
  | "COUPON_INVALID"
  | "COUPON_INACTIVE"
  | "COUPON_EXPIRED"
  | "COUPON_USAGE_LIMIT"
  | "COUPON_MIN_ORDER"
  | "INVALID_VARIANT"
  | "INVALID_ADDON"
  | "ADDRESS_NOT_OWNED"
  | "RESTAURANT_UNAVAILABLE"
  | "MINIMUM_ORDER"
  | "INVALID_TIP";

export class PricingError extends Error {
  constructor(public readonly code: PricingErrorCode, message: string, public readonly status = 400) {
    super(message);
    this.name = "PricingError";
  }
}

type Product = { id: string; restaurant_id: string; name: string; price: number | string; image_url: string | null; is_available: boolean };
type Variant = { id: string; product_id: string; name: string; price_delta: number | string; is_available: boolean };
type Addon = { id: string; restaurant_id: string; name: string; price: number | string; is_available: boolean };
type Restaurant = { id: string; name: string; delivery_fee: number | string; packaging_charge: number | string; min_order_amount: number | string; is_open: boolean; is_approved: boolean };
type Coupon = { id: string; discount_type: "flat" | "percent"; discount_value: number | string; min_order_amount: number | string; max_discount: number | string | null; max_uses: number | null; used_count: number; valid_from: string; valid_until: string | null; restaurant_id: string | null; is_active: boolean };
type Address = { id: string; full_address: string; flat_no: string | null; landmark: string | null; lat: number | string | null; lng: number | string | null; delivery_instructions: string | null };

export type PricedLine = {
  productId: string;
  variantId?: string;
  addonIds: string[];
  name: string;
  imageUrl: string | null;
  quantity: number;
  baseUnitPrice: number;
  variantUnitPrice: number;
  addonsUnitPrice: number;
  unitPrice: number;
  lineTotal: number;
};

export type PricingResult = {
  restaurantId: string;
  couponId: string | null;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryInstructions: string | null;
  lines: PricedLine[];
  subtotal: number;
  gst: number;
  deliveryFee: number;
  packagingCharge: number;
  platformFee: number;
  discount: number;
  tip: number;
  total: number;
};

const asRows = <T>(rows: Record<string, unknown>[]) => rows as T[];
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);

function toAddress(row: Record<string, unknown> | null): Address | null { return row as Address | null; }
function formatAddress(address: Address) {
  return `${address.flat_no ? `${address.flat_no}, ` : ""}${address.full_address}${address.landmark ? ` (${address.landmark})` : ""}`;
}

function validateCoupon(coupon: Coupon | null, couponCode: string | undefined, restaurantId: string, subtotal: number) {
  if (!couponCode) return { coupon: null, discount: 0 };
  if (!coupon) throw new PricingError("COUPON_INVALID", "Coupon is invalid");
  if (!coupon.is_active) throw new PricingError("COUPON_INACTIVE", "Coupon is inactive");
  const now = Date.now();
  if (new Date(coupon.valid_from).getTime() > now || (coupon.valid_until && new Date(coupon.valid_until).getTime() <= now)) {
    throw new PricingError("COUPON_EXPIRED", "Coupon is expired or not active yet");
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) throw new PricingError("COUPON_USAGE_LIMIT", "Coupon usage limit has been reached");
  if (coupon.restaurant_id && coupon.restaurant_id !== restaurantId) throw new PricingError("COUPON_INVALID", "Coupon is not valid for this restaurant");
  if (subtotal < numberValue(coupon.min_order_amount)) throw new PricingError("COUPON_MIN_ORDER", "Order does not meet the coupon minimum");
  const rawDiscount = coupon.discount_type === "flat"
    ? numberValue(coupon.discount_value)
    : subtotal * numberValue(coupon.discount_value) / 100;
  const cappedDiscount = coupon.max_discount === null ? rawDiscount : Math.min(rawDiscount, numberValue(coupon.max_discount));
  return { coupon, discount: money(Math.min(cappedDiscount, subtotal)) };
}

/** The only authoritative order-pricing function. It never reads client price or total fields. */
export async function priceCart(repository: PricingRepository, input: OrderRequest, userId: string): Promise<PricingResult> {
  for (const item of input.items) {
    if (item.quantity <= 0 || item.quantity > PER_ITEM_CAP) throw new PricingError("INVALID_QUANTITY", `Quantity must be between 1 and ${PER_ITEM_CAP}`);
  }
  if (input.tip < 0 || input.tip > 500) throw new PricingError("INVALID_TIP", "Tip must be between 0 and 500");

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const variantIds = [...new Set(input.items.flatMap((item) => item.variantId ? [item.variantId] : []))];
  const addonIds = [...new Set(input.items.flatMap((item) => item.addonIds))];
  const data: PricingData = await repository.load({ userId, addressId: input.addressId, productIds, variantIds, addonIds, couponCode: input.couponCode });
  const address = toAddress(data.address);
  if (!address) throw new PricingError("ADDRESS_NOT_OWNED", "Delivery address was not found");

  const products = asRows<Product>(data.products);
  if (products.length !== productIds.length || products.some((product) => !product.is_available)) {
    throw new PricingError("PRODUCT_UNAVAILABLE", "One or more products are unavailable");
  }
  const restaurantIds = [...new Set(products.map((product) => product.restaurant_id))];
  if (restaurantIds.length !== 1) throw new PricingError("MULTIPLE_RESTAURANTS", "All cart items must belong to one restaurant");
  const restaurantId = restaurantIds[0];
  const restaurant = asRows<Restaurant>(data.restaurants).find((row) => row.id === restaurantId);
  if (!restaurant || !restaurant.is_approved || !restaurant.is_open) throw new PricingError("RESTAURANT_UNAVAILABLE", "Restaurant is not accepting orders");

  const productById = new Map(products.map((product) => [product.id, product]));
  const variants = asRows<Variant>(data.variants);
  const addons = asRows<Addon>(data.addons);
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const addonById = new Map(addons.map((addon) => [addon.id, addon]));
  const linkKeys = new Set(asRows<{ product_variant_id: string; product_addon_id: string }>(data.addonLinks).map((link) => `${link.product_variant_id}:${link.product_addon_id}`));

  const lines = input.items.map((item): PricedLine => {
    const product = productById.get(item.productId)!;
    const variant = item.variantId ? variantById.get(item.variantId) : undefined;
    if (item.variantId && (!variant || !variant.is_available || variant.product_id !== product.id)) {
      throw new PricingError("INVALID_VARIANT", "Selected variant is not available for this product");
    }
    const selectedAddons = item.addonIds.map((addonId) => {
      const addon = addonById.get(addonId);
      if (!addon || !addon.is_available || addon.restaurant_id !== product.restaurant_id || !variant || !linkKeys.has(`${variant.id}:${addonId}`)) {
        throw new PricingError("INVALID_ADDON", "Selected add-on is not available for this product");
      }
      return addon;
    });
    const baseUnitPrice = numberValue(product.price);
    const variantUnitPrice = numberValue(variant?.price_delta);
    const addonsUnitPrice = selectedAddons.reduce((sum, addon) => sum + numberValue(addon.price), 0);
    const unitPrice = money(baseUnitPrice + variantUnitPrice + addonsUnitPrice);
    return { productId: product.id, variantId: variant?.id, addonIds: item.addonIds, name: product.name, imageUrl: product.image_url, quantity: item.quantity, baseUnitPrice, variantUnitPrice, addonsUnitPrice, unitPrice, lineTotal: money(unitPrice * item.quantity) };
  });

  const subtotal = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  if (subtotal < numberValue(restaurant.min_order_amount)) throw new PricingError("MINIMUM_ORDER", "Order does not meet the restaurant minimum");
  const { coupon, discount } = validateCoupon(data.coupon as Coupon | null, input.couponCode, restaurantId, subtotal);
  const deliveryFee = money(subtotal >= FREE_DELIVERY_ABOVE ? 0 : numberValue(restaurant.delivery_fee));
  const packagingCharge = money(numberValue(restaurant.packaging_charge));
  const gst = money(subtotal * GST_RATE);
  const tip = money(input.tip);
  const total = money(Math.max(0, subtotal + gst + deliveryFee + packagingCharge + PLATFORM_FEE + tip - discount));
  return { restaurantId, couponId: coupon?.id ?? null, deliveryAddress: formatAddress(address), deliveryLat: address.lat === null ? null : numberValue(address.lat), deliveryLng: address.lng === null ? null : numberValue(address.lng), deliveryInstructions: address.delivery_instructions, lines, subtotal, gst, deliveryFee, packagingCharge, platformFee: PLATFORM_FEE, discount, tip, total };
}
