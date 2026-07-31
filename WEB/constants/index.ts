// ─── Pricing ────────────────────────────────────────────────────────────────
export const DELIVERY_FEE_DEFAULT = 35; // INR
export const PACKAGING_CHARGE = 10; // INR
export const TAX_RATE = 0.05; // 5% GST
export const FREE_DELIVERY_ABOVE = 299; // INR
export const PLATFORM_FEE = 5; // INR

// ─── Cart ────────────────────────────────────────────────────────────────────
export const CART_STORAGE_KEY = "kanak-foods-cart";
export const MAX_CART_ITEMS_PER_PRODUCT = 10;
export const TIP_OPTIONS = [10, 20, 30, 50]; // INR

// ─── Auth ────────────────────────────────────────────────────────────────────
export const SESSION_COOKIE = "kanak-session";
export const AUTH_REDIRECT_AFTER_LOGIN = "/";

// ─── Roles ───────────────────────────────────────────────────────────────────
export const ROLES = {
  CUSTOMER: "customer",
  DELIVERY: "delivery",
  STORE: "store",
  ADMIN: "admin",
} as const;

// ─── Order Statuses ──────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "assigned",
  "picked",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

// ─── Delivery Task Statuses ───────────────────────────────────────────────────
export const DELIVERY_STATUSES = [
  "assigned",
  "accepted",
  "picked",
  "in_transit",
  "delivered",
] as const;

// ─── Payment Methods ─────────────────────────────────────────────────────────
export const PAYMENT_METHODS = {
  RAZORPAY: "razorpay",
  COD: "cod",
} as const;

// ─── Address Labels ───────────────────────────────────────────────────────────
export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;

// ─── Image Domains ────────────────────────────────────────────────────────────
export const IMAGE_DOMAINS = [
  "images.unsplash.com",
  "lh3.googleusercontent.com",
];

// ─── Supabase Storage Buckets ─────────────────────────────────────────────────
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  RESTAURANTS: "restaurants",
  REVIEWS: "reviews",
  BANNERS: "banners",
} as const;

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;

// ─── Currency ────────────────────────────────────────────────────────────────
export const CURRENCY = "INR";
export const CURRENCY_LOCALE = "en-IN";

// ─── Realtime ────────────────────────────────────────────────────────────────
export const REALTIME_EVENTS_PER_SECOND = 5;

// ─── Search ──────────────────────────────────────────────────────────────────
export const SEARCH_DEBOUNCE_MS = 350;
export const MIN_SEARCH_LENGTH = 2;

// ─── Rating ──────────────────────────────────────────────────────────────────
export const MAX_RATING = 5;
export const MIN_RATING = 1;
