# Kanak Foods — Version 1.0 Implementation Plan

## Summary

The existing codebase in `WEB/` is a solid **early prototype** built with Next.js 16, TypeScript, Tailwind CSS v4, Supabase, and TanStack Query. It has the right skeleton — auth, cart, orders, store dashboard, delivery dashboard — but every layer needs production hardening, missing features, and architectural uplift to qualify as a launchable V1.0.

The plan below retains and extends all existing working code, adds every required feature, and refactors the project directory into the requested clean-architecture shape.

---

## Existing Code Assessment

| Area | Current State | Gap |
|---|---|---|
| Auth | Email + Password only, single combined form | OTP, mobile, forgot password, reset, role guard improvements |
| Profile | Not implemented | Full profile management page |
| Home | Hero + categories + restaurant grid | Real search, filter, offers from DB |
| Restaurant | Menu with add-to-cart | Reviews, veg badge, variants/addons |
| Cart | localStorage cart | Coupon field, tip, packaging charge |
| Checkout | Address text area + mock payment | Real address selector, Razorpay, COD |
| Orders | List + detail with realtime | Cancel, reorder, invoice download |
| Order Tracking | Basic status list | Visual timeline, realtime animation |
| Store Dashboard | Orders + menu | Revenue, analytics, coupons, business hours |
| Delivery Dashboard | Task list + status mutation | Earnings, history, availability toggle |
| Admin Panel | Not implemented | Full admin panel |
| Notifications | Not implemented | Realtime + push |
| Reviews | Not implemented | Rating, photos, restaurant reply |
| Database Schema | Good base | Extended schema: coupons, reviews, banners, notifications, earnings |
| Directory Structure | Flat `components/` + `lib/` | Full feature-based architecture |
| PWA | Service worker registration stub | Full manifest, offline page, caching |
| Security | Basic RLS | Complete RLS, server-side validation |
| Design | Minimal orange theme | Premium glassmorphism, dark-mode-ready, micro-animations |

---

## Architecture Decisions

### Directory Structure (Target)

```
WEB/
├── app/
│   ├── (auth)/              # Auth group layout
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (customer)/          # Customer-facing group
│   │   ├── page.tsx         # Home
│   │   ├── search/
│   │   ├── restaurants/[id]/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   │   └── [id]/
│   │   └── profile/
│   │       └── addresses/
│   ├── (store)/             # Restaurant owner group
│   │   └── store/
│   │       ├── page.tsx     # Dashboard
│   │       ├── menu/
│   │       ├── orders/
│   │       ├── analytics/
│   │       └── settings/
│   ├── (delivery)/          # Delivery partner group
│   │   └── delivery/
│   │       ├── page.tsx     # Dashboard
│   │       ├── history/
│   │       └── earnings/
│   ├── (admin)/             # Admin group
│   │   └── admin/
│   │       ├── page.tsx     # Dashboard
│   │       ├── users/
│   │       ├── restaurants/
│   │       ├── orders/
│   │       ├── coupons/
│   │       └── banners/
│   ├── api/                 # API Routes
│   │   ├── razorpay/
│   │   └── webhooks/
│   └── offline/
├── components/
│   ├── ui/                  # Design system atoms
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── modal.tsx
│   │   ├── toast.tsx
│   │   └── skeleton.tsx
│   ├── layout/              # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── mobile-nav.tsx
│   │   └── sidebar.tsx
│   └── shared/              # Shared feature components
│       ├── restaurant-card.tsx
│       ├── product-card.tsx
│       ├── order-status-timeline.tsx
│       └── address-picker.tsx
├── features/                # Feature-scoped logic
│   ├── auth/
│   ├── cart/
│   ├── orders/
│   ├── restaurants/
│   ├── delivery/
│   ├── store/
│   └── admin/
├── hooks/                   # Shared custom hooks
│   ├── use-auth.ts
│   ├── use-toast.ts
│   ├── use-geolocation.ts
│   └── use-realtime.ts
├── services/                # Data access layer
│   ├── auth.service.ts
│   ├── orders.service.ts
│   ├── restaurants.service.ts
│   └── payments.service.ts
├── repositories/            # Database query layer
│   ├── orders.repo.ts
│   ├── restaurants.repo.ts
│   └── profiles.repo.ts
├── types/                   # Shared TypeScript types
│   ├── database.ts          # DB row types
│   ├── domain.ts            # Domain/business types
│   └── api.ts               # API response types
├── utils/                   # Pure utility functions
│   ├── format.ts
│   ├── validation.ts
│   └── cn.ts
├── constants/               # Application constants
│   └── index.ts
└── lib/
    ├── supabase/
    │   ├── client.ts        # Browser client
    │   └── server.ts        # Server component client
    └── razorpay.ts
```

---

## Implementation Phases

### Phase 1 — Foundation & Design System
- Extended globals.css with CSS variables, dark mode prep, custom animations
- Design system components: Button, Input, Badge, Card, Modal, Toast, Skeleton
- Toast notification system (no external library)
- Layout: new premium Header with search, mobile bottom nav
- Font: Inter (Google Fonts)
- `utils/cn.ts` (class merge utility)
- `constants/index.ts`

### Phase 2 — Database Schema Extensions
- New tables: `coupons`, `reviews`, `banners`, `notifications`, `restaurant_earnings`
- Profile fields: avatar_url, gender, dob, wallet_balance, reward_points, referral_code
- Product fields: is_veg, sort_order
- Restaurant fields: min_order_amount, packaging_charge, cuisine_type, avg_rating, total_reviews, approved
- Extended RLS policies
- Extended `seed.sql` with richer data

### Phase 3 — Authentication
- Dedicated `/login` and `/register` pages with proper UI
- Forgot password page
- Reset password page (handles Supabase email link)
- Change password in profile
- OTP flow (Supabase phone auth)
- Session persistence (already done via Supabase)
- Middleware for protected routes
- `hooks/use-auth.ts` — centralized auth state

### Phase 4 — Customer Profile & Addresses
- `/profile` page: avatar upload, name, phone, email, gender, DOB, wallet balance, reward points, referral code
- Notification preferences
- Delete account
- `/profile/addresses` — CRUD address management with GPS location

### Phase 5 — Home & Search
- Home page: hero, categories from DB, popular restaurants, offers from banners table, top-rated, recently ordered
- `/search` page: full-text search across restaurants and products
- Filter sidebar: veg/non-veg, price range, rating, delivery time, open now, distance
- Sort options: popularity, fast delivery, lowest price, highest rating

### Phase 6 — Restaurant & Menu
- Improved restaurant detail: veg badge, proper variants display, out-of-stock items
- Category navigation sticky on scroll
- Reviews section on restaurant page

### Phase 7 — Cart & Checkout
- Cart: coupon field, special instructions, tip rider, GST breakdown, packaging charge
- Checkout: saved address selector + add new, payment method selection (Razorpay/COD)
- Razorpay integration (API route for order creation)
- Order placement with payment verification

### Phase 8 — Orders & Tracking
- Order list: improved UI with reorder button
- Order detail: visual timeline, live status bar, invoice download link
- Cancel order (before acceptance)

### Phase 9 — Reviews
- Post-delivery review flow: rate food, restaurant, delivery partner
- Star rating input
- Image upload to Supabase Storage
- Edit / delete review
- Restaurant reply

### Phase 10 — Store Dashboard
- Tabs: Orders, Menu, Analytics, Coupons, Profile, Business Hours
- Revenue stats, order count, chart (simple)
- Coupon management: create, deactivate
- Business hours configuration
- Restaurant profile edit

### Phase 11 — Delivery Partner Dashboard
- Today's earnings
- Active delivery map display
- Delivery history
- Availability toggle
- Improved task cards

### Phase 12 — Admin Panel
- `/admin` dashboard with key metrics
- User management table
- Restaurant approval queue
- Order management with filter
- Coupon management
- Banner management
- Revenue report

### Phase 13 — Notifications
- In-app realtime notifications (Supabase Realtime → `notifications` table)
- Notification bell in header
- Email notifications (triggered by Supabase edge functions — noted in schema)

### Phase 14 — PWA & Performance
- Full `manifest.json`
- Service worker with cache strategy
- Offline page
- Image optimization: domains config
- Skeleton loaders throughout
- Code splitting (Next.js does this automatically with App Router)

### Phase 15 — Security & Polish
- `middleware.ts` protecting routes by role
- Input sanitization utilities
- Rate limiting on API routes
- Comprehensive error boundaries
- 404 / error pages
- SEO meta tags on every page

---

## Proposed Changes

### [NEW] Schema Extensions

#### [MODIFY] [schema.sql](file:///d:/My%20project/Kanak%20food%20store/WEB/supabase/schema.sql)
Add: coupons, reviews, banners, notifications tables. Extend profiles, restaurants, products columns.

---

### Foundation Layer

#### [MODIFY] [globals.css](file:///d:/My%20project/Kanak%20food%20store/WEB/app/globals.css)
Premium design system variables, animations, scrollbar, dark mode skeleton.

#### [NEW] utils/cn.ts
Class name merge utility.

#### [NEW] constants/index.ts
All app-wide constants (fees, rates, roles, limits).

#### [NEW] types/database.ts, types/domain.ts
Extended TypeScript types.

---

### UI Components

#### [NEW] components/ui/button.tsx
#### [NEW] components/ui/input.tsx
#### [NEW] components/ui/badge.tsx
#### [NEW] components/ui/card.tsx
#### [NEW] components/ui/modal.tsx
#### [NEW] components/ui/skeleton.tsx
#### [NEW] components/ui/toast.tsx
#### [NEW] hooks/use-toast.ts

---

### Layout

#### [MODIFY] components/app-shell.tsx → split into components/layout/header.tsx + mobile-nav.tsx

---

### Auth

#### [NEW] app/(auth)/login/page.tsx
#### [NEW] app/(auth)/register/page.tsx
#### [NEW] app/(auth)/forgot-password/page.tsx
#### [NEW] app/(auth)/reset-password/page.tsx
#### [NEW] middleware.ts

---

### Customer Features

#### [MODIFY] app/page.tsx — Full home page with all sections
#### [NEW] app/search/page.tsx
#### [MODIFY] app/restaurants/[id]/page.tsx — Reviews, veg badge
#### [MODIFY] app/cart/page.tsx — Coupon, tip, packaging
#### [MODIFY] app/checkout/page.tsx — Address selector, Razorpay, COD
#### [MODIFY] app/orders/page.tsx — Reorder button
#### [MODIFY] app/orders/[id]/page.tsx — Visual timeline, cancel, invoice
#### [NEW] app/profile/page.tsx
#### [NEW] app/profile/addresses/page.tsx

---

### Store Dashboard

#### [MODIFY] app/store/page.tsx → tabbed dashboard with orders, menu, analytics, coupons, settings

---

### Delivery Dashboard

#### [MODIFY] app/delivery/page.tsx → improved with earnings, history, availability toggle

---

### Admin Panel

#### [NEW] app/admin/page.tsx
#### [NEW] app/admin/users/page.tsx
#### [NEW] app/admin/restaurants/page.tsx
#### [NEW] app/admin/orders/page.tsx
#### [NEW] app/admin/coupons/page.tsx
#### [NEW] app/admin/banners/page.tsx

---

### API Routes

#### [NEW] app/api/razorpay/create-order/route.ts
#### [NEW] app/api/razorpay/verify-payment/route.ts

---

### Notifications

#### [NEW] features/notifications/notification-bell.tsx
#### [NEW] hooks/use-notifications.ts

---

### PWA

#### [MODIFY] next.config.ts — image domains, PWA headers
#### [NEW] public/manifest.json

---

## Open Questions

> [!IMPORTANT]
> **Razorpay Keys**: You will need `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` environment variables for the payment integration. The implementation will add these to `.env.example`. If you don't have a Razorpay account yet, COD will work fully without it. Razorpay code will be gated so the app doesn't break without those keys.

> [!IMPORTANT]
> **Supabase Storage Bucket**: Profile avatar uploads and review image uploads require a Supabase Storage bucket named `avatars` and `reviews` to be created in your Supabase project. The schema will document this but the bucket creation must be done in the Supabase dashboard.

> [!NOTE]
> **Phone/OTP Auth**: Supabase's phone OTP requires Twilio or a similar provider to be configured in the Supabase project settings. The implementation will include the full OTP UI but the backend connectivity depends on your Supabase phone provider config.

> [!NOTE]
> **Google Maps**: Address GPS picker will use the browser's built-in Geolocation API (no Google Maps key required). A text-based address input + GPS button approach will be used for V1.0.

---

## Verification Plan

### Build Check
```bash
cd "d:/My project/Kanak food store/WEB"
npm run build
```

### Dev Server
```bash
npm run dev
```

### Manual Verification
1. Register as Customer → place order → track in realtime
2. Register as Store owner → accept order → mark ready → assign delivery
3. Register as Delivery partner → accept → mark delivered
4. Admin login → approve restaurants, manage users
5. Test all auth flows (login, register, forgot password)
6. Test cart with coupon, COD checkout
7. Test search and filters
8. Verify mobile responsiveness on 375px viewport

---

## Execution Order

The implementation will proceed in this exact order:
1. Schema SQL extensions
2. Constants + types + utils
3. Design system (CSS + UI components)
4. Layout (header, mobile nav)
5. Auth pages + middleware
6. Home page
7. Restaurant detail
8. Cart + Checkout
9. Orders + Tracking
10. Profile + Addresses
11. Store Dashboard (tabbed)
12. Delivery Dashboard
13. Admin Panel
14. Reviews
15. Notifications
16. PWA + performance
17. Security hardening
18. Final build verification
