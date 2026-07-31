# Kanak Foods V1 launch checklist

## Setup and Supabase

- [ ] Install dependencies and populate `.env.local` from `.env.example`.
- [ ] Apply `supabase/schema.sql`, then migrations `001` through `010` in numeric order; do not edit applied migrations.
- [ ] Apply `supabase/storage-policies.sql` after the schema and verify buckets/policies for avatars, reviews, restaurants, and banners.
- [ ] Confirm RLS is enabled and run the integration/RLS matrix against dedicated test accounts.
- [ ] Configure Supabase Auth redirect URLs, email/OTP templates, and production site URL.

## Secrets and Razorpay

- [ ] Set public Supabase and Razorpay key ID values only where explicitly marked `NEXT_PUBLIC_`.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` as server-only secrets.
- [ ] In Razorpay, configure `https://<domain>/api/webhooks/razorpay`, enable payment capture/failure/refund events, and copy the webhook secret into the server environment.
- [ ] Verify a Razorpay order amount equals the database order total and verify callback/webhook replay behavior.

## Pre-staging verification

- [ ] Run `npm test`, `npm run test:pricing`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- [ ] Run integration tests with dedicated customer, store, and delivery accounts; never point them at production.
- [ ] Confirm service-worker offline fallback, manifest validation, 404/error pages, and no payment secrets, signatures, or payloads appear in logs.
- [ ] Confirm an order cannot use another user’s address, a mixed restaurant cart, unavailable items, client totals, or an invalid state transition.
