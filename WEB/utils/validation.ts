import { z } from "zod";

export const addressSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]),
  full_address: z.string().trim().min(8).max(500),
  flat_no: z.string().trim().max(100).optional(),
  landmark: z.string().trim().max(150).optional(),
  delivery_instructions: z.string().trim().max(300).optional(),
  lat: z.number().finite().nullable().optional(),
  lng: z.number().finite().nullable().optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[a-z0-9_-]+$/i),
  discount_type: z.enum(["flat", "percent"]),
  discount_value: z.number().positive(),
  min_order_amount: z.number().nonnegative(),
  max_discount: z.number().positive().nullable().optional(),
});

export const reviewSchema = z.object({
  food_rating: z.number().int().min(1).max(5),
  restaurant_rating: z.number().int().min(1).max(5),
  delivery_rating: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().trim().max(1000).optional(),
});

// ─── Razorpay Payment Schemas ────────────────────────────────────────────────

export const createPaymentOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  orderId: z.string().uuid(),
});

export function safeText(value: string, max = 500) {
  return value.replace(/[<>]/g, "").trim().slice(0, max);
}
