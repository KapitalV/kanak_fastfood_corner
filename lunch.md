# Kanak Foods V1 implementation audit and setup guide

Updated: 2026-07-28

This document audits `implementation_plan.md` against the current code in `WEB/` and explains how to add the external database, authentication, payment, storage, backend, deployment, and verification configuration.

## Executive result

The application compiles and the main customer, store, delivery, admin, auth, cart, checkout, order, PWA, and notification surfaces exist.

The plan is **not 100% functionally complete yet**. The remaining work is mainly production integration and several UI/workflow gaps: reviews, OTP, server-side payment finalization, earnings, business-hours management, true store sub-pages, push/email notifications, rate limiting, and storage policies.

Legend:

- **Complete**: implemented in the repository.
- **Partial**: the route/schema/skeleton exists, but the complete production workflow is not finished.
- **External setup**: code exists, but Supabase/Razorpay/provider configuration is required.
- **Missing**: still needs implementation.

## Plan status by phase

| Phase | Status | Evidence / remaining work |
|---|---|---|
| 1. Foundation and design system | Complete | CSS variables, animations, Inter via `next/font`, UI components, toast provider, constants, header, mobile navigation, skeletons. |
| 2. Database extensions | Partial / external setup | `supabase/schema.sql` now contains restaurant earnings, a delivered-order earnings trigger, profiles, restaurants, products, addresses, coupons, orders, order items, delivery tasks, reviews, banners, notifications, RLS, and realtime publication setup. Variants/addons and notification preferences are not modeled. Run the SQL in Supabase before testing. |
| 3. Authentication | Complete / external setup | Login, register, forgot-password, reset-password, OTP route, session persistence, middleware role checks, password change, account deletion API, and role gate exist. Configure Supabase Auth URLs, phone provider, and the server-only service role key for deletion. |
| 4. Profile and addresses | Partial / external setup | Profile, password change, account deletion API, address routes, and geolocation support exist. Avatar upload and notification preferences still need completion plus Storage policies. |
| 5. Home and search | Partial | Home, restaurant search, query parameters, rating/open filters, and restaurant listing exist. Banner offers, product-wide search, distance/delivery-time filters, recently ordered, and the full filter/sort matrix are incomplete. |
| 6. Restaurant and menu | Partial | Restaurant detail, menu items, veg badges, availability, categories, and add-to-cart exist. Variants/addons and a real reviews section are not complete; category navigation is not a full sticky navigation system. |
| 7. Cart and checkout | Partial / external setup | Coupon, tip, GST, delivery, packaging, platform fee, saved addresses, COD, and Razorpay client/API integration exist. Server-side ownership, amount checks, payment finalization, rate limits, and webhook verification are now implemented. Razorpay keys and production webhook configuration are still required. |
| 8. Orders and tracking | Partial | Order list/detail, status timeline, realtime subscriptions, cancellation foundation, reorder, and invoice text download exist. A polished PDF invoice and richer animated tracking UI remain. |
| 9. Reviews | Partial / external setup | Review table, aggregate trigger, delivered-order review route, star ratings, comments, image uploads, restaurant review display, and restaurant reply display exist. Edit/delete and restaurant reply management UI remain; create the `reviews` Storage bucket and policies. |
| 10. Store dashboard | Partial | Store dashboard manages orders/products and delivery assignment. Analytics and store open/close settings now have dedicated workflows. Dedicated menu/orders tabs, coupon CRUD, business-hours editor, and full restaurant profile editing remain. |
| 11. Delivery dashboard | Partial | Delivery task status flow, realtime updates, availability toggle, map link, history, and earnings pages exist. A live map and formal payout ledger remain. |
| 12. Admin panel | Partial | Dashboard, metrics, users, restaurants, orders, coupons, and banners routes exist. Restaurant approval plus coupon/banner create and activate/deactivate actions are implemented; advanced filtering, user actions, and full order operations remain. |
| 13. Notifications | Partial / external setup | Notifications table, realtime hook, bell, inbox, read state, and RLS exist. Push notifications, email/Edge Function triggers, notification preferences, and a notification creation pipeline are missing. |
| 14. PWA and performance | Partial | Manifest, service worker, offline route, registration, image remote pattern, and skeletons exist. Add production caching/versioning review, icon PNG variants, install testing, and image component migration. |
| 15. Security and polish | Partial | RLS, input validation utilities, middleware role checks, error page, 404, metadata, rate limiting for payment APIs, server-side payment authorization, and build checks exist. Rate limiting for auth/coupon/order endpoints, complete server-side mutation authorization, monitoring, and raw image cleanup remain. |

## Current route inventory

Implemented routes include:

```text
/                         Customer home
/search                   Search
/restaurants/[id]         Restaurant and menu
/cart                     Cart
/checkout                 Address and payment checkout
/orders                   Customer order list
/orders/[id]              Order detail/tracking
/profile                  Customer profile
/profile/addresses        Address management
/login                    Login
/register                 Registration
/forgot-password          Password reset request
/reset-password           Password reset completion
/store                    Store dashboard
/store/menu               Store menu route placeholder/reuse
/store/orders             Store orders route placeholder/reuse
/store/analytics          Store analytics route placeholder/reuse
/store/settings           Store settings route placeholder/reuse
/delivery                 Delivery dashboard
/delivery/history         Delivery history route placeholder/reuse
/delivery/earnings        Delivery earnings route placeholder/reuse
/admin                    Admin metrics
/admin/users              User table
/admin/restaurants        Restaurant approval
/admin/orders             Order table
/admin/coupons            Coupon table
/admin/banners            Banner table
/notifications            Notification inbox
/offline                  Offline fallback
```

## Local setup

From PowerShell:

```powershell
cd "D:\My project\Kanak food store\WEB"
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app can render without Supabase credentials, but authentication, database data, realtime updates, and checkout require a configured Supabase project.

## Environment variables

Create `WEB/.env.local` locally. Never commit this file.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Public browser key used by the Razorpay checkout script.
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx

# Server-only. Never prefix this with NEXT_PUBLIC_ and never expose it to the browser.
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx

# Optional deployment URL used for password-reset links and webhook configuration.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add the same values to the hosting provider's environment settings. Use test Razorpay keys during development and live keys only in production.

## Supabase database setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run all of `WEB/supabase/schema.sql`.
4. Create Auth users for at least one customer, one store owner, one delivery partner, and one admin.
5. Copy each `auth.users.id` into the placeholders in `WEB/supabase/seed.sql`.
6. Run `WEB/supabase/seed.sql`.
7. Sign in once with each account so the profile upsert logic can complete.
8. Confirm the user's `profiles.role` is exactly one of `customer`, `store`, `delivery`, or `admin`.

The schema already includes RLS policies. After running it, verify in Supabase that RLS is enabled for every business table and that the policies match the intended roles.

### Recommended database additions still required

The plan calls for earnings and richer product/order functionality. Add a migration rather than editing production tables manually:

```sql
create table if not exists public.restaurant_earnings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  gross_amount numeric(10,2) not null default 0,
  platform_fee numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_earnings_restaurant_idx
  on public.restaurant_earnings(restaurant_id, created_at desc);
```

Before using this table from the store dashboard, add RLS policies allowing the restaurant owner and admin to read it. Do not allow customers to update it.

For product variants/addons, add separate normalized tables such as `product_variants`, `product_addons`, and `product_addon_links`; do not store arbitrary JSON in the order total without a server-side price calculation.

## Supabase Storage setup

Create public or authenticated buckets according to the privacy requirement:

- `avatars`: profile avatars.
- `reviews`: customer review images.
- `restaurants`: restaurant images/logos.
- `banners`: admin-managed promotional images.

Recommended approach:

1. Create the buckets in Supabase Storage.
2. Use authenticated upload policies restricted to the current user's folder.
3. Use public read only for assets that are intentionally public.
4. Store only the resulting storage path or public URL in `profiles.avatar_url`, `reviews.images`, `restaurants.image_url`, or `banners.image_url`.
5. Validate file size, MIME type, and extension in the browser and again in the server/API path.

Example policy shape for an avatar object path beginning with the user's ID:

```sql
create policy "avatar owner upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Add matching select/update/delete policies only after deciding whether the bucket is public or private.

## Authentication and roles

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `http://localhost:3000` locally, production URL in production.
- Redirect URL: `http://localhost:3000/reset-password` locally and the equivalent production URL.

For phone OTP:

1. Enable Phone provider in Supabase Auth.
2. Configure Twilio or another supported SMS provider.
3. Add a dedicated OTP UI using `supabase.auth.signInWithOtp({ phone })`.
4. Verify with `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
5. Upsert the profile only after the session is established.

Role assignment must happen server-side or through a protected admin operation. Do not trust a role supplied by a browser form.

## Payment and backend API requirements

Current API routes:

- `POST /api/razorpay/create-order`: creates a Razorpay order when server keys exist.
- `POST /api/razorpay/verify-payment`: verifies the HMAC signature.

Before production use, update the payment flow so the server:

1. Authenticates the caller.
2. Loads the order from Supabase by ID and confirms it belongs to the caller.
3. Recalculates the total from database prices, fees, coupon rules, and quantities.
4. Creates the Razorpay order using the recalculated amount.
5. Verifies the payment signature using constant-time comparison.
6. Updates `orders.payment_status`, `razorpay_order_id`, and `razorpay_payment_id` server-side.
7. Rejects duplicate payment finalization and mismatched order amounts.
8. Writes an audit/notification event.

The current verification route is a scaffold and should not be treated as a complete payment backend until those server-side order checks are added.

Add a Razorpay webhook route under `app/api/webhooks/razorpay/route.ts` for asynchronous events such as payment captured, failed, refunded, and disputed. Verify the webhook signature and make handlers idempotent.

Do not put `RAZORPAY_KEY_SECRET`, a Supabase service-role key, or any database admin credential in client code or a `NEXT_PUBLIC_` variable.

## Backend data flow

The intended request flow is:

```text
Browser UI
  -> feature hook/service
  -> API route or Supabase client query
  -> RLS / server authorization
  -> Supabase Postgres, Auth, Storage, or Realtime
  -> typed response
  -> query cache and UI state
```

Use the existing layers consistently:

- `repositories/`: Supabase query functions only.
- `services/`: business rules, totals, authorization decisions, and orchestration.
- `app/api/`: server-only secrets and external integrations.
- `types/database.ts`: database row types.
- `types/domain.ts`: joined/domain types.
- `types/api.ts`: request/response contracts.
- `utils/validation.ts`: Zod schemas and sanitization helpers.

Do not calculate authoritative order totals only in React. The client total is for display; the server/database must recalculate it before inserting or confirming an order.

## Remaining feature work, in priority order

### P0: required before accepting real payments

- Secure order creation and payment finalization on the server.
- Razorpay webhook and idempotency handling.
- Authenticated server-side role checks for every admin/store/delivery mutation.
- Rate limiting on login, coupon validation, order creation, and payment endpoints.
- Production Supabase Storage policies.
- Verify all RLS policies with real customer/store/delivery/admin accounts.

### P1: required for the full written plan

- Review create/edit/delete UI, review image upload, and restaurant replies.
- Product variants and addons.
- Real store tabs for analytics, coupons, business hours, and restaurant profile.
- Delivery availability, history, earnings, and map state.
- Reorder and invoice download.
- Home banners, product search, recently ordered, and complete filters/sorting.
- OTP flow and change-password UI.
- Push/email notification pipeline.

### P2: polish and operations

- Replace remaining raw `<img>` elements with `next/image` where appropriate.
- Add automated tests for pricing, permissions, order transitions, coupons, and payment verification.
- Add structured logging and error monitoring.
- Add database migration tooling and CI checks.
- Add PNG PWA icons and verify installation on Android/iOS browsers.

## Verification commands

```powershell
cd "D:\My project\Kanak food store\WEB"
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Expected current result:

- TypeScript: passes.
- Production build: passes.
- Lint: passes with warnings only; remaining warnings are unused imports/raw image recommendations.
- Local production server: `http://localhost:3000` returns HTTP 200 when started with `npm run start`.

## Manual acceptance checklist

- [ ] Customer registration and login.
- [ ] Password reset email and reset link.
- [ ] Customer sees only their own addresses and orders.
- [ ] Customer can add a product, change quantity, apply a valid coupon, add a tip, and place COD order.
- [ ] Customer cannot place an order with a manipulated client total.
- [ ] Store owner sees only their restaurant orders/products.
- [ ] Store can progress an order and assign a delivery partner.
- [ ] Delivery partner sees only assigned tasks and can progress delivery status.
- [ ] Admin can approve a restaurant and review metrics.
- [ ] Realtime order and notification updates work.
- [ ] Review submission and image storage work after the review feature is completed.
- [ ] Razorpay test payment and webhook work in a test project.
- [ ] Offline page appears when navigation fails offline.
- [ ] Mobile layout is usable at 375px width.
- [ ] RLS tests pass for all four roles.

## Deployment checklist

1. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
2. Configure all environment variables in Vercel or the chosen host.
3. Run the schema migration against the production Supabase project.
4. Configure Auth redirect URLs for the production domain.
5. Configure Storage buckets and policies.
6. Configure Razorpay live keys only after test payment verification succeeds.
7. Configure Razorpay webhook URL and secret verification.
8. Confirm realtime publication includes `orders`, `delivery_tasks`, and `notifications`.
9. Create an admin user through a controlled server/database process.
10. Run the manual acceptance checklist with non-production test accounts.
11. Enable monitoring, backups, and database migration history.

## Files to update when adding new backend information

- Environment variable: `WEB/.env.example` and deployment secret settings.
- Database table/function/policy: `WEB/supabase/schema.sql` or a new numbered migration.
- Seed/demo data: `WEB/supabase/seed.sql`.
- Database row shape: `WEB/types/database.ts`.
- Joined/business shape: `WEB/types/domain.ts`.
- API response shape: `WEB/types/api.ts`.
- Query: `WEB/repositories/`.
- Business rule: `WEB/services/`.
- Server-only integration: `WEB/app/api/`.
- User-facing feature: the appropriate `WEB/app/`, `WEB/features/`, `WEB/components/`, or `WEB/hooks/` path.
- Setup or operational instructions: this `lunch.md` file and `WEB/README.md`.
