# Kanak Foods — Complete Project Reference

> **Last updated:** 2026-07-30  
> **Build status:** ✅ `npx tsc --noEmit` • ✅ `npm run lint` (0 errors) • ✅ `npm run build` (41 routes)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Implementation Phases — Status](#6-implementation-phases--status)
7. [Routes and Pages](#7-routes-and-pages)
8. [API Routes](#8-api-routes)
9. [Storage System](#9-storage-system)
10. [Supabase Migrations](#10-supabase-migrations)
11. [Security Architecture](#11-security-architecture)
12. [What Still Needs Doing](#12-what-still-needs-doing)

---

## 1. Project Overview

**App name:** Kanak Foods  
**Type:** Food ordering platform (restaurant marketplace)  
**Location:** `d:/My project/Kanak food store/WEB/`

### User Roles

| Role | Access |
|---|---|
| `customer` | Browse, order, track, review, manage profile and addresses |
| `store` | Manage restaurant menu, orders, business hours, analytics, coupons |
| `delivery` | Accept deliveries, update status, view earnings and history |
| `admin` | Full platform control — users, restaurants, orders, coupons, banners |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 + custom CSS variables |
| UI Components | Hand-built design system (no external UI lib) |
| Auth | Supabase Auth (email/password + OTP) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Storage | Supabase Storage (4 buckets) |
| Server State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Payments | Razorpay (orders + webhooks) |
| Rate Limiting | Upstash Redis + @upstash/ratelimit |
| Icons | Lucide React |
| PWA | Web App Manifest + Service Worker |

---

## 3. Directory Structure

```
WEB/
├── app/
│   ├── (auth)/                         # Auth group layout (no nav bar)
│   │   ├── login/page.tsx              DONE
│   │   ├── register/page.tsx           DONE
│   │   ├── forgot-password/            DONE
│   │   ├── reset-password/             DONE
│   │   └── otp/page.tsx                DONE
│   ├── admin/
│   │   ├── page.tsx                    DONE - Dashboard metrics
│   │   ├── users/                      DONE
│   │   ├── restaurants/                DONE - Approval queue
│   │   ├── orders/                     DONE
│   │   ├── coupons/                    DONE
│   │   └── banners/                    DONE - File upload wired
│   ├── api/
│   │   ├── account/delete/             DONE - Hard delete + cleanup
│   │   ├── orders/                     DONE - Place order (atomic)
│   │   │   ├── status/                 DONE - Status mutation
│   │   │   └── convert-to-cod/         DONE
│   │   ├── profile/availability/       DONE - Delivery toggle
│   │   ├── razorpay/
│   │   │   ├── create-order/           DONE
│   │   │   └── verify-payment/         DONE
│   │   ├── upload/                     DONE - Magic-byte validated upload
│   │   └── webhooks/razorpay/          DONE - Signature-verified webhook
│   ├── auth/                           DONE - Auth callback handler
│   ├── cart/page.tsx                   DONE - Cart with coupon, tip, GST
│   ├── checkout/page.tsx               DONE - Address + Razorpay + COD
│   ├── delivery/
│   │   ├── page.tsx                    DONE - Task list + availability toggle
│   │   ├── earnings/                   DONE
│   │   └── history/                    DONE
│   ├── notifications/page.tsx          DONE - Realtime bell + list
│   ├── offline/page.tsx                DONE - PWA offline page
│   ├── orders/
│   │   ├── page.tsx                    DONE - Order history + reorder
│   │   └── [id]/
│   │       ├── page.tsx                DONE - Detail + timeline + cancel
│   │       └── review/page.tsx         DONE - Star rating + image upload
│   ├── profile/
│   │   ├── page.tsx                    DONE - Avatar upload + edit + security
│   │   └── addresses/page.tsx          DONE - CRUD + GPS
│   ├── restaurants/[id]/page.tsx       DONE - Menu + reviews + veg badge
│   ├── search/page.tsx                 DONE - Full-text + filters + sort
│   ├── store/
│   │   ├── page.tsx                    DONE - Orders dashboard
│   │   ├── analytics/                  DONE - Revenue charts
│   │   ├── menu/                       DONE - Product CRUD + variants
│   │   ├── orders/                     DONE - Accept/reject/status
│   │   └── settings/                   DONE - Image upload + business hours
│   ├── globals.css                     DONE - Design tokens + animations
│   ├── layout.tsx                      DONE - Root layout + providers
│   ├── page.tsx                        DONE - Home (hero, categories, banners)
│   ├── error.tsx                       DONE
│   └── not-found.tsx                   DONE
│
├── components/
│   ├── ui/
│   │   ├── button.tsx                  DONE - primary/secondary/ghost/danger
│   │   ├── input.tsx                   DONE - Input + Field + Textarea
│   │   ├── badge.tsx                   DONE
│   │   ├── card.tsx                    DONE - Card + CardHeader + CardBody
│   │   ├── modal.tsx                   DONE - Portal-based modal
│   │   ├── skeleton.tsx                DONE - Page-level skeletons
│   │   ├── toast.tsx                   DONE - Toast system (no external lib)
│   │   └── index.ts                    DONE - Barrel exports
│   ├── admin/
│   │   ├── admin-shell.tsx             DONE - Admin sidebar layout
│   │   └── data-page.tsx               DONE - Generic data table
│   ├── layout/                         DONE
│   ├── app-shell.tsx                   DONE - Header + mobile bottom nav
│   ├── cart-provider.tsx               DONE - localStorage cart context
│   ├── providers.tsx                   DONE - QueryClient + Toast
│   ├── role-gate.tsx                   DONE - Role-based component guard
│   ├── service-worker-registration.tsx DONE
│   └── use-auth-profile.ts             DONE
│
├── features/
│   ├── cart/                           DONE - Cart context + helpers
│   └── notifications/                  DONE - Realtime notification bell
│
├── hooks/
│   ├── use-auth.ts                     DONE - Session + profile query
│   ├── use-debounce.ts                 DONE
│   ├── use-geolocation.ts              DONE - Browser GPS
│   └── use-notifications.ts            DONE - Realtime Supabase subscription
│
├── lib/
│   ├── auth.ts                         DONE - requireUser/requireRole/requireOwnership
│   ├── cart.ts                         DONE - Cart utilities
│   ├── rate-limit.ts                   DONE - Upstash Redis rate limiter
│   ├── storage.ts                      DONE - Client validation + magic-byte sniffing
│   ├── supabase.ts                     DONE - Browser client
│   ├── supabase-server.ts              DONE - Server component client (cookies)
│   ├── supabase-admin.ts               DONE - Service role client (server-only)
│   └── types.ts                        DONE - Shared lib types
│
├── repositories/                       DONE - DB query layer (Supabase only)
│   ├── checkout.repo.ts
│   ├── orders.repo.ts
│   ├── payments.repo.ts
│   ├── pricing.repo.ts
│   ├── profiles.repo.ts
│   ├── restaurants.repo.ts
│   ├── reviews.repo.ts
│   └── store.repo.ts
│
├── services/                           DONE - Business logic layer
│   ├── auth.service.ts
│   ├── orders.service.ts
│   ├── payments.service.ts
│   ├── pricing.service.ts              DONE - Tax, fees, coupon, tip calc
│   ├── restaurants.service.ts
│   └── storage.service.ts              DONE - uploadAvatar/uploadReviewImages etc.
│
├── types/
│   ├── database.ts                     DONE - DB row types
│   ├── domain.ts                       DONE - Joined/business types
│   └── api.ts                          DONE - API contract types
│
├── utils/
│   ├── cn.ts                           DONE - Class merge utility
│   ├── format.ts                       DONE - Currency, date, distance formatters
│   └── validation.ts                   DONE - Zod schemas
│
├── constants/index.ts                  DONE - App-wide constants
├── middleware.ts                       DONE - Auth + role routing guard
│
├── supabase/
│   ├── schema.sql                      DONE - Full production schema
│   ├── storage-policies.sql            DONE - Buckets + RLS + cleanup triggers
│   ├── seed.sql                        DONE - Demo data
│   └── migrations/                     DONE - 9 numbered migrations
│
├── public/
│   ├── manifest.json                   DONE - PWA manifest
│   ├── sw.js                           DONE - Service worker
│   └── icons/                          DONE - App icons
│
├── .env.example                        DONE
├── next.config.ts                      DONE
├── tsconfig.json                       DONE
└── package.json                        DONE
```

---

## 4. Environment Variables

```env
# Public — safe for the browser bundle
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-public-razorpay-key-id
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only — NEVER use NEXT_PUBLIC_ prefix for these
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # required for /api/upload
RAZORPAY_KEY_ID=your-server-razorpay-key-id
RAZORPAY_KEY_SECRET=your-server-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret
```

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security. It must never appear in the browser bundle. It is only used in `lib/supabase-admin.ts`, which is imported only from server-side files.

---

## 5. Database Schema

### Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | User accounts linked to `auth.users` | id, name, phone, email, avatar_url, role, wallet_balance, reward_points, referral_code, is_active, is_available |
| `restaurants` | Restaurant listings | id, owner_id, name, address, lat, lng, is_open, is_approved, delivery_fee, packaging_charge, avg_rating, image_url |
| `business_hours` | Weekly schedule per restaurant | restaurant_id, day_of_week, opens_at, closes_at, is_closed |
| `products` | Menu items | id, restaurant_id, name, price, image_url, category, is_veg, is_available, sort_order |
| `product_variants` | Size/type variants | id, product_id, name, price_delta |
| `product_addons` | Extra items | id, restaurant_id, name, price |
| `addresses` | Delivery addresses | id, user_id, label, full_address, flat_no, lat, lng, is_default |
| `coupons` | Discount codes | id, code, discount_type (flat/percent), discount_value, min_order_amount, max_uses, restaurant_id |
| `orders` | Order records | id, customer_id, restaurant_id, total_amount, subtotal, delivery_fee, tax_amount, packaging_charge, platform_fee, tip_amount, coupon_discount, payment_method, payment_status, order_status, idempotency_key |
| `order_items` | Line items — price snapshotted | id, order_id, product_id, name_snapshot, price_snapshot, quantity |
| `delivery_tasks` | Delivery assignments | id, order_id, delivery_boy_id, status, assigned_at, accepted_at, picked_at, delivered_at |
| `reviews` | Customer feedback | id, order_id, customer_id, restaurant_id, food_rating, restaurant_rating, delivery_rating, images[], restaurant_reply |
| `banners` | Home page promotions | id, title, subtitle, image_url, link_url, is_active, sort_order |
| `notifications` | In-app notifications | id, user_id, title, body, type, data, is_read |
| `notification_preferences` | Per-user notification opt-ins | user_id, email, push, sms, marketing, order_updates |
| `payment_events` | Razorpay webhook log | id, order_id, provider_event_id, type, payload |
| `restaurant_earnings` | Revenue per order | id, restaurant_id, order_id, gross_amount, platform_fee, net_amount, status |

### Enums

`user_role` · `payment_status` · `order_status` · `delivery_task_status` · `discount_type` · `address_label` · `notification_type`

### Key Functions and Triggers

| Object | What it does |
|---|---|
| `public.current_role()` | Returns calling user's role from profiles; used in RLS policies |
| `public.set_updated_at()` | Trigger function: keeps `updated_at` column current |
| `public.update_restaurant_rating()` | Trigger: auto-recalculates avg_rating + total_reviews on review change |
| `public.place_order(…)` | Atomic stored procedure: validates stock, locks rows, inserts order + items in one transaction |
| `public.finalize_payment(…)` | Marks order as paid, creates delivery_task row |
| `public.storage_is_admin()` | plpgsql helper (deferred resolution) — used in banners storage RLS |
| `public.storage_is_restaurant_owner_or_admin()` | plpgsql helper — used in restaurants storage RLS |
| `public.storage_cleanup_folder()` | Deletes `storage.objects` rows when parent DB record is deleted |

---

## 6. Implementation Phases — Status

### Phase 1 — Foundation and Design System — COMPLETE

- `app/globals.css` — CSS custom properties (color, spacing, radius), keyframe animations, custom scrollbar
- Full component library: Button (4 variants + loading), Input + Field + Textarea, Badge, Card + CardHeader + CardBody, Modal (portal), Skeleton, Toast system
- `utils/cn.ts` — class name merge utility
- `constants/index.ts` — platform fee, tax rates, role names, order statuses
- Inter font via Google Fonts (Next.js font optimisation)

### Phase 2 — Database Schema — COMPLETE

- `supabase/schema.sql` — all tables, enums, indexes, RLS policies, trigger functions
- Extended `profiles`: avatar_url, gender, dob, wallet_balance, reward_points, referral_code
- Extended `restaurants`: min_order_amount, packaging_charge, cuisine_type, avg_rating, is_approved, image_url
- Additional tables: coupons, reviews, banners, notifications, restaurant_earnings
- `types/database.ts` — full TypeScript row types inferred from DB
- `types/domain.ts` — joined/business types
- `types/api.ts` — API request/response contract types

### Phase 3 — Authentication — COMPLETE

- Email/password login + register with role selection
- Forgot/reset password via Supabase email link
- Phone OTP verification flow
- Supabase auth callback handler
- `middleware.ts` — session refresh on every request, redirect unauthenticated users, role-based path guard
- `lib/auth.ts` — `requireUser()`, `requireRole()`, `requireOwnership()`, `handleAuthError()`
- `hooks/use-auth.ts` — cached `useAuthProfile()` TanStack Query hook
- `components/role-gate.tsx` — component-level role guard

### Phase 4 — Customer Profile and Addresses — COMPLETE

- Profile page: avatar upload (→ `profiles.avatar_url`), name, phone, email, change password, delete account
- Wallet balance and reward points display
- Address management: full CRUD, GPS auto-fill, default address toggle
- `app-shell.tsx` — responsive header with user menu and mobile bottom navigation

### Phase 5 — Home and Search — COMPLETE

- Home page: hero banner, banner carousel (from DB), category grid, restaurant listing, top-rated section
- Search page: full-text search across restaurants and products
- Filters: veg-only, open now, minimum rating
- Sort by: popularity, rating, delivery time

### Phase 6 — Restaurant and Menu — COMPLETE

- Restaurant detail page: cover photo, veg badge, category navigation, info strip
- Menu items with add-to-cart, quantity controls
- Variants display
- Reviews section with star ratings and uploaded photos
- Out-of-stock indicator

### Phase 7 — Cart and Checkout — COMPLETE

- Cart: item list, inline quantity edit, coupon field (validates against DB server-side), tip presets, full price breakdown (subtotal, delivery fee, packaging, platform fee, GST, coupon discount, tip)
- Checkout: saved address selector, add new address with GPS, payment method toggle (Razorpay / COD)
- Razorpay: server-side order creation, client-side Razorpay.js modal, server-side HMAC verify
- `services/pricing.service.ts` — all totals recalculated server-side; client total is never trusted
- `repositories/pricing.repo.ts` — coupon validation, live price fetch

### Phase 8 — Orders and Tracking — COMPLETE

- Order history list with reorder button
- Order detail page: visual status timeline, realtime Supabase subscription for live updates, estimated delivery time, cancel with reason
- `place_order()` stored procedure — atomic, idempotency-key protected, stock-validated
- `finalize_payment()` stored procedure — payment confirmation + delivery task creation
- `app/api/orders/` — secure server-side order route (idempotency key prevents double-charge)
- `app/api/orders/status/` — status mutation with role-gated ownership checks
- `app/api/orders/convert-to-cod/` — fallback for abandoned Razorpay sessions

### Phase 9 — Reviews — COMPLETE

- Review form: three-axis star rating (food, restaurant, delivery), comment field, up to 3 photo uploads
- Images uploaded via `/api/upload` (magic-byte sniffed) and stored as public URLs in `reviews.images[]`
- `repositories/reviews.repo.ts` — review CRUD + restaurant reply support

### Phase 10 — Store Dashboard — COMPLETE

- Live order queue with accept/reject/status update actions
- Menu management: product CRUD, category grouping, veg toggle, sort order drag
- Revenue analytics: chart, order count, top products
- Order list with date and status filters
- Settings: restaurant cover photo upload, open/close toggle, business hours day-by-day editor

### Phase 11 — Delivery Partner Dashboard — COMPLETE

- Task list: active assignments with accept button, map link, status progression
- Availability toggle (live-updates `profiles.is_available` via `/api/profile/availability`)
- Earnings: daily and weekly breakdowns
- Delivery history: completed orders

### Phase 12 — Admin Panel — COMPLETE

- Platform metrics dashboard: total users, restaurants, orders, revenue
- User management: role change, deactivate/reactivate
- Restaurant approval queue: approve / reject with reason
- Platform-wide order view with status and date filters
- Coupon management: create flat/percent codes, deactivate
- Banner management: file-picker-based image upload → `/api/upload` → `banners.image_url`, show/hide toggle

### Phase 13 — Notifications — COMPLETE

- Realtime notification bell in the header (Supabase Realtime subscription)
- Unread count badge
- Full notification list page with mark-as-read
- `supabase/migrations/003_notification_preferences.sql` — per-user opt-in settings

### Phase 14 — PWA and Performance — COMPLETE

- `public/manifest.json` — app name, icons (192px, 512px, maskable), theme colour, standalone display
- `public/sw.js` — service worker with cache-first for static assets, network-first for API
- Client-side service worker registration component
- `/offline` — graceful offline fallback page
- `supabase/migrations/006_phase1_indexes.sql` — composite indexes for frequent query patterns

### Phase 15 — Security Hardening — COMPLETE

- `middleware.ts` — auth session refresh, role check, redirect on unauthenticated or wrong-role access
- `lib/auth.ts` — `requireUser()`, `requireRole()`, `requireOwnership()` composable guards used in every API route
- `lib/rate-limit.ts` — Upstash Redis sliding-window rate limiter on all write API routes
- `lib/storage.ts` — dual-layer file validation: client pre-check (MIME/extension/size) + server magic-byte sniff
- `app/api/upload/` — the only upload path; service role bypasses storage RLS; never trusts client-reported content-type
- `utils/validation.ts` — Zod schemas for all API inputs
- Idempotency keys on order creation prevent double-charges on network retry
- `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are server-only env vars
- `error.tsx` and `not-found.tsx` — friendly error boundaries

### Storage Phase — Supabase Storage — COMPLETE

- `supabase/storage-policies.sql` — 4 public buckets with file size/MIME limits, 16 RLS policies (4 per bucket), cleanup triggers
- All functions and triggers in `public` schema (Supabase forbids `storage.*` user-created objects)
- plpgsql helpers with `EXCEPTION WHEN undefined_table` guards — script is safe to run before schema.sql
- DO block wrappers on every trigger creation — safe even when target table is absent
- `lib/storage.ts` — magic-byte signatures for JPEG (FFD8FF), PNG (89504E47), WebP (52494646…57454250), GIF (47494638)
- `app/api/upload/route.ts` — per-bucket auth rules, `buildStoragePath()`, admin client upload, returns `publicUrl`
- `services/storage.service.ts` — typed wrappers: `uploadAvatar()`, `uploadReviewImages()`, `uploadRestaurantImage()`, `uploadBannerImage()`
- UI wired: avatar (profile page), restaurant image (store settings), review photos (review form), banner (admin)

---

## 7. Routes and Pages

### Customer

| Route | Description | Auth Required |
|---|---|---|
| `/` | Home — hero, banners, categories, restaurants | Public |
| `/search` | Search and filter restaurants/products | Public |
| `/restaurants/[id]` | Menu + reviews | Public |
| `/cart` | Cart with coupon, tip, GST | Public |
| `/checkout` | Address selection + payment | customer |
| `/orders` | Order history | customer |
| `/orders/[id]` | Order detail + realtime tracking | customer |
| `/orders/[id]/review` | Post-delivery review + photos | customer |
| `/profile` | Edit profile + avatar upload | any role |
| `/profile/addresses` | Address CRUD | any role |
| `/notifications` | Notification list | any role |

### Auth (no nav bar)

| Route | Description |
|---|---|
| `/login` | Sign in |
| `/register` | Sign up with role selection |
| `/forgot-password` | Password reset email |
| `/reset-password` | New password (from email link) |
| `/otp` | Phone OTP verification |
| `/auth` | Supabase OAuth callback |

### Store Owner

| Route | Description | Auth Required |
|---|---|---|
| `/store` | Live order queue | store |
| `/store/menu` | Product CRUD | store |
| `/store/orders` | Order history + filters | store |
| `/store/analytics` | Revenue charts | store |
| `/store/settings` | Image + hours + open toggle | store |

### Delivery Partner

| Route | Description | Auth Required |
|---|---|---|
| `/delivery` | Active tasks + availability | delivery |
| `/delivery/earnings` | Earnings breakdown | delivery |
| `/delivery/history` | Completed deliveries | delivery |

### Admin

| Route | Description | Auth Required |
|---|---|---|
| `/admin` | Platform metrics | admin |
| `/admin/users` | User management | admin |
| `/admin/restaurants` | Approval queue | admin |
| `/admin/orders` | All orders | admin |
| `/admin/coupons` | Coupon management | admin |
| `/admin/banners` | Banner management + upload | admin |

---

## 8. API Routes

All routes: authenticate server-side → authorize by ownership → Zod validate → rate limit → execute.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/orders` | Atomic order creation via `place_order()` stored procedure |
| PATCH | `/api/orders/status` | Mutate order status (role-gated) |
| POST | `/api/orders/convert-to-cod` | Convert abandoned Razorpay order to COD |
| POST | `/api/razorpay/create-order` | Server-side Razorpay order (authoritative total) |
| POST | `/api/razorpay/verify-payment` | HMAC verify + `finalize_payment()` |
| POST | `/api/webhooks/razorpay` | Webhook handler (signature-verified, idempotent) |
| POST | `/api/upload` | Magic-byte sniffed file upload to Supabase Storage |
| PATCH | `/api/profile/availability` | Delivery availability toggle |
| DELETE | `/api/account/delete` | Hard-delete account + cascade cleanup |

---

## 9. Storage System

### Buckets

| Bucket | Visibility | Max Size | Allowed Types | Path Pattern |
|---|---|---|---|---|
| `avatars` | Public | 2 MB | JPEG, PNG, WebP, GIF | `avatars/{user_id}/{file}` |
| `reviews` | Public | 5 MB | JPEG, PNG, WebP | `reviews/{user_id}/{order_id}/{file}` |
| `restaurants` | Public | 5 MB | JPEG, PNG, WebP | `restaurants/{restaurant_id}/{file}` |
| `banners` | Public | 5 MB | JPEG, PNG, WebP | `banners/{banner_id}/{file}` |

### Upload Flow

```
Browser picks file
  → validateFileClient()     client pre-check: MIME + extension + byte size
  → POST /api/upload
       → requireUser() + requireOwnership()   auth gate
       → validateFileServer()                 magic-byte sniff (never trusts client MIME)
       → getAdminSupabase().storage.upload()  service role, bypasses RLS
       → returns { path, publicUrl, sniffedMime }
  → save publicUrl to the relevant DB column
```

### RLS Policy Matrix

| Bucket | INSERT | SELECT | UPDATE | DELETE |
|---|---|---|---|---|
| `avatars` | own folder only | public | own folder only | own folder only |
| `reviews` | own folder only | public | own folder only | own folder only |
| `restaurants` | owner or admin | public | owner or admin | owner or admin |
| `banners` | admin only | public | admin only | admin only |

### Storage Cleanup Triggers

When a DB row is deleted, its storage folder is cleaned up automatically.

| Table deleted | Bucket + prefix cleaned |
|---|---|
| `public.profiles` | `avatars/{user_id}/` |
| `public.reviews` | `reviews/{customer_id}/{order_id}/` |
| `public.restaurants` | `restaurants/{restaurant_id}/` |
| `public.banners` | `banners/{banner_id}/` |

---

## 10. Supabase Migrations

Run in this order. Each file is idempotent (safe to re-run).

```
supabase/schema.sql                          ← Run first, always
supabase/migrations/
  001_hardening.sql                          RLS policy hardening, is_active checks
  002_product_catalog.sql                    product_variants, product_addons tables
  003_notification_preferences.sql           notification_preferences table + RLS
  004_payment_events.sql                     payment_events (Razorpay webhook log)
  005_business_hours.sql                     business_hours table + RLS
  006_phase1_indexes.sql                     Composite indexes for performance
  007_atomic_order_creation.sql              place_order() stored procedure
  008_finalize_payment.sql                   finalize_payment() stored procedure
  009_reviews_reorder_store.sql              Store dashboard helpers, reorder support
supabase/storage-policies.sql                ← Run after or independently (self-contained)
```

> [!IMPORTANT]
> Never edit a migration file that has already been applied to production. Always create a new numbered file for schema changes.

---

## 11. Security Architecture

### Core Principles

1. **Server is the source of truth for money.** Order totals are always recalculated server-side. Client-submitted prices are never trusted.
2. **Secrets are server-only.** `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are never prefixed with `NEXT_PUBLIC_`.
3. **Schema changes = new numbered migration.** Never edit an applied migration file.
4. **Every mutation: authenticate, then authorize by resource ownership.**
5. **Zod-validate all API input.** No raw data from `request.json()` hits the DB.
6. **Never trust client-reported MIME type.** Magic bytes are sniffed on the server.

### Request Security Layers

```
Browser request
  → Next.js middleware     session refresh, protected-route redirect, role check
  → API Route handler      requireUser() → requireRole() → requireOwnership()
  → Zod schema validation  parseBody() throws on bad shape/types
  → Rate limiter           Upstash Redis sliding window
  → Service layer          business rules, server-authoritative pricing
  → Repository layer       Supabase query with prepared params
  → Database               Row Level Security as final backstop
```

---

## 12. What Still Needs Doing

### Manual Supabase Dashboard Steps

> [!IMPORTANT]
> **Run SQL scripts** in the Supabase SQL Editor in this order:
> 1. `supabase/schema.sql`
> 2. `supabase/migrations/001_hardening.sql` through `009_reviews_reorder_store.sql`
> 3. `supabase/storage-policies.sql`

> [!IMPORTANT]
> **Set `.env.local`** before running the app:
> - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role
> - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — Razorpay dashboard
> - Register your Razorpay webhook URL: `https://your-domain.com/api/webhooks/razorpay`

> [!NOTE]
> **Phone OTP** requires Twilio (or another provider) configured in Supabase → Authentication → Providers → Phone.

### Planned Future Features

| Feature | Priority | Notes |
|---|---|---|
| Replace img with next/image | Medium | Fixes 6 existing lint warnings, improves LCP |
| Web Push notifications | Medium | Needs VAPID keys + service worker push event handler |
| Real-time delivery GPS map | Medium | Supabase Realtime + Leaflet or Mapbox |
| Restaurant payout flow | Medium | Bank account collection + payout trigger |
| Google / Apple OAuth | Low | Supabase supports it — enable in dashboard |
| Invoice PDF download | Low | Generate PDF server-side on `/orders/[id]` |
| Wallet top-up | Low | Razorpay → credit `wallet_balance` |
| Referral code rewards | Low | Schema ready (`profiles.referral_code` exists) |
| Multi-language (i18n) | Low | next-intl |
| Product add-on UI | Low | Schema exists (migration 002), UI not yet built |
| Variant-aware cart | Low | Schema exists, cart currently ignores variants |
