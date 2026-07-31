// ─── Domain / Business Types ──────────────────────────────────────────────────
// These extend DB types with joined relations used in queries.

import type {
  DbProfile,
  DbRestaurant,
  DbProduct,
  DbOrder,
  DbOrderItem,
  DbDeliveryTask,
  DbAddress,
  DbCoupon,
  DbReview,
  DbBanner,
  DbNotification,
  DbRestaurantEarning,
  DbProductVariant,
  DbProductAddon,
  DbProductAddonLink,
  DbNotificationPreferences,
  DbPaymentEvent,
  UserRole,
} from "./database";

// Re-export for convenience
export type {
  UserRole,
  DbProfile as Profile,
  DbRestaurant as Restaurant,
  DbProduct as Product,
  DbOrder as Order,
  DbOrderItem as OrderItem,
  DbDeliveryTask as DeliveryTask,
  DbAddress as Address,
  DbCoupon as Coupon,
  DbReview as Review,
  DbBanner as Banner,
  DbNotification as Notification,
  DbRestaurantEarning as RestaurantEarning,
  DbProductVariant as ProductVariant,
  DbProductAddon as ProductAddon,
  DbProductAddonLink as ProductAddonLink,
  DbNotificationPreferences as NotificationPreferences,
  DbPaymentEvent as PaymentEvent,
};

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartLine {
  productId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  quantity: number;
  variantId?: string;
  addonIds?: string[];
  specialInstructions?: string;
}

export interface CartState {
  lines: CartLine[];
  tip: number;
  coupon: DbCoupon | null;
  couponDiscount: number;
}

// ─── Enriched / Joined Types ──────────────────────────────────────────────────

export interface OrderWithDetails extends DbOrder {
  restaurants?: Pick<DbRestaurant, "id" | "name" | "address" | "image_url"> | null;
  order_items?: DbOrderItem[];
  profiles?: Pick<DbProfile, "id" | "name" | "phone"> | null;
}

export interface DeliveryTaskWithOrder extends DbDeliveryTask {
  orders?: OrderWithDetails | null;
}

export interface ReviewWithProfile extends DbReview {
  profiles?: Pick<DbProfile, "id" | "name" | "avatar_url"> | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  profile: DbProfile | null;
}

// ─── Search / Filter ─────────────────────────────────────────────────────────

export interface RestaurantFilters {
  isVeg?: boolean;
  minRating?: number;
  maxDeliveryTime?: number;
  isOpen?: boolean;
  sortBy?: "popularity" | "fast_delivery" | "lowest_price" | "highest_rating";
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

export interface PaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
