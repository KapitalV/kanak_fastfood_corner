# Kanak Foods Implementation Update

Last updated: July 28, 2026

## Scope completed

This update documents the server-authoritative pricing and order creation hardening that was added to the existing Next.js 16 + TypeScript + Tailwind v4 + Supabase codebase.

The core rule now enforced is:

- the server is the source of truth for all money values
- the browser no longer decides order totals
- order creation recalculates every price from database state at request time

## What was built

### 1. Authoritative pricing service

File:

- [services/pricing.service.ts](<D:/My project/Kanak food store/WEB/services/pricing.service.ts>)

Added one pricing entry point:

- `priceCart(repository, input, userId)`

This function:

- validates order input with Zod
- loads product, restaurant, variant, addon, coupon, and address data from the database
- ignores any client-provided totals or manipulated price values
- computes line totals, subtotal, GST, delivery fee, packaging charge, platform fee, discount, tip, and final total
- returns a normalized server pricing result for persistence and payment

### 2. Typed pricing errors

The pricing service now rejects invalid order requests with typed business errors, including:

- product unavailable or missing
- invalid quantity
- multiple restaurants in one cart
- invalid or expired coupon
- coupon minimum order failure
- coupon usage limit reached
- invalid variant
- invalid addon
- address not owned by the authenticated user
- restaurant unavailable
- minimum order not met
- invalid tip

### 3. Pricing repository layer

File:

- [repositories/pricing.repo.ts](<D:/My project/Kanak food store/WEB/repositories/pricing.repo.ts>)

Added a dedicated repository for pricing data loading so that:

- `repositories/` stays responsible for Supabase queries only
- `services/` stays responsible for business rules and money calculation

### 4. Hardened order API

File:

- [app/api/orders/route.ts](<D:/My project/Kanak food store/WEB/app/api/orders/route.ts>)

The `POST /api/orders` route now:

- authenticates first on the server
- validates request payload with Zod
- calls `priceCart(...)`
- inserts the order using server-computed amounts only
- inserts order items using the server pricing snapshot
- compensates by deleting the order if item insertion fails
- returns the server total and itemized pricing response

No client total is trusted or persisted.

### 5. Checkout flow changed to display-only totals

Files:

- [app/checkout/page.tsx](<D:/My project/Kanak food store/WEB/app/checkout/page.tsx>)
- [types/domain.ts](<D:/My project/Kanak food store/WEB/types/domain.ts>)

Checkout still shows an estimated total in the browser for UX, but that estimate is no longer treated as authoritative.

The order payload now sends:

- `addressId`
- `paymentMethod`
- `tip`
- `instructions`
- `couponCode`
- item product IDs
- quantities
- selected variant IDs
- selected addon IDs

The browser does not send a final payable total to order creation.

### 6. Payment helper cleanup

File:

- [services/payments.service.ts](<D:/My project/Kanak food store/WEB/services/payments.service.ts>)

Updated the helper to create a Razorpay order from `orderId` instead of taking a client-side amount. This keeps payment order creation aligned with server-stored order totals.

### 7. Targeted pricing tests

Files:

- [services/pricing.service.test.ts](<D:/My project/Kanak food store/WEB/services/pricing.service.test.ts>)
- [tsconfig.pricing-tests.json](<D:/My project/Kanak food store/WEB/tsconfig.pricing-tests.json>)
- [package.json](<D:/My project/Kanak food store/WEB/package.json>)

Added focused pricing tests covering:

- flat coupon
- percent coupon with cap
- minimum-order coupon rejection
- expired coupon rejection
- tip handling
- multi-quantity pricing
- variant and addon combinations
- manipulated client total attempt

Test command:

```bash
npm run test:pricing
```

## Places where client totals were found or removed

### Removed or corrected

- `app/checkout/page.tsx`
  the order submission no longer sends any final total to `/api/orders`

- `services/payments.service.ts`
  changed payment order creation from client `amount` input to server `orderId`

### Kept intentionally because they are safe

- checkout UI estimated totals in `app/checkout/page.tsx`
  these remain for display only

- Razorpay checkout `amount` usage in the client payment popup
  this value comes back from the server-created Razorpay order, not from browser pricing logic

## Verification status

Verified locally:

- `npm run test:pricing`
- `npx tsc --noEmit`

Lint/build note:

- the repo needed an ESLint ignore for generated pricing test output under `.pricing-tests/`
- the generated test output directory was added to `.gitignore`
- this update file does not claim deployment or production execution

## Assumptions used

- Supabase schema for product variants and addons will be available through the Phase 1 migrations already prepared under `supabase/migrations/`
- order item insertion can safely use compensating delete if a single SQL transaction is not currently implemented in this codebase
- checkout preview totals may remain client-side as long as the server recalculates and returns the authoritative total

## Manual setup still required

- apply the required Supabase migrations before relying on variant/addon pricing in production-like environments
- confirm RLS policies and ownership expectations on any newly added schema objects
- verify Razorpay keys and webhook settings in the dashboard if payment flows are being tested end-to-end

## Files added or updated for this implementation

- [app/api/orders/route.ts](<D:/My project/Kanak food store/WEB/app/api/orders/route.ts>)
- [app/checkout/page.tsx](<D:/My project/Kanak food store/WEB/app/checkout/page.tsx>)
- [repositories/pricing.repo.ts](<D:/My project/Kanak food store/WEB/repositories/pricing.repo.ts>)
- [services/payments.service.ts](<D:/My project/Kanak food store/WEB/services/payments.service.ts>)
- [services/pricing.service.ts](<D:/My project/Kanak food store/WEB/services/pricing.service.ts>)
- [services/pricing.service.test.ts](<D:/My project/Kanak food store/WEB/services/pricing.service.test.ts>)
- [types/domain.ts](<D:/My project/Kanak food store/WEB/types/domain.ts>)
- [tsconfig.pricing-tests.json](<D:/My project/Kanak food store/WEB/tsconfig.pricing-tests.json>)
- [package.json](<D:/My project/Kanak food store/WEB/package.json>)
- [eslint.config.mjs](<D:/My project/Kanak food store/WEB/eslint.config.mjs>)
- [.gitignore](<D:/My project/Kanak food store/WEB/.gitignore>)

