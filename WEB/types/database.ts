// ─── Database Row Types (mirrors Supabase schema) ─────────────────────────────

export type UserRole = "customer" | "delivery" | "store" | "admin";
export type PaymentStatus = "pending" | "razorpay" | "cod" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "awaiting_payment"
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "assigned"
  | "picked"
  | "in_transit"
  | "delivered"
  | "cancelled";
export type DeliveryTaskStatus = "assigned" | "accepted" | "picked" | "in_transit" | "delivered";
export type AddressLabel = "Home" | "Work" | "Other";

export interface DbProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  gender: "male" | "female" | "other" | null;
  dob: string | null;
  role: UserRole;
  wallet_balance: number;
  reward_points: number;
  referral_code: string | null;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbRestaurant {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  is_open: boolean;
  is_approved: boolean;
  delivery_radius_km: number;
  min_order_amount: number;
  delivery_fee: number;
  packaging_charge: number;
  avg_rating: number;
  total_reviews: number;
  cuisine_type: string | null;
  image_url: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  fssai: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_veg: boolean;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface DbOrder {
  id: string;
  customer_id: string;
  restaurant_id: string;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  tax_amount: number;
  packaging_charge: number;
  platform_fee: number;
  tip_amount: number;
  coupon_id: string | null;
  coupon_discount: number;
  payment_method: "razorpay" | "cod";
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  order_status: OrderStatus;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_instructions: string | null;
  delivery_boy_id: string | null;
  special_instructions: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  idempotency_key: string | null;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  image_snapshot: string | null;
  quantity: number;
}

export interface DbDeliveryTask {
  id: string;
  order_id: string;
  delivery_boy_id: string;
  status: DeliveryTaskStatus;
  assigned_at: string;
  accepted_at: string | null;
  picked_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
}

export interface DbAddress {
  id: string;
  user_id: string;
  label: AddressLabel;
  full_address: string;
  flat_no: string | null;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  description: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  restaurant_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbReview {
  id: string;
  order_id: string;
  customer_id: string;
  restaurant_id: string;
  food_rating: number;
  restaurant_rating: number;
  delivery_rating: number | null;
  comment: string | null;
  images: string[];
  restaurant_reply: string | null;
  restaurant_replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: "order" | "promo" | "system";
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface DbRestaurantEarning {
  id: string;
  restaurant_id: string;
  order_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  created_at: string;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  name: string;
  price_delta: number;
  is_available: boolean;
  created_at: string;
}

export interface DbProductAddon {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  is_available: boolean;
  created_at: string;
}

export interface DbProductAddonLink {
  product_variant_id: string;
  product_addon_id: string;
  created_at: string;
}

export interface DbNotificationPreferences {
  user_id: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  order_updates: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPaymentEvent {
  id: string;
  order_id: string;
  provider_event_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}
