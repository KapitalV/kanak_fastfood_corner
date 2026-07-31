# Kanak Foods

Next.js 16 food ordering PWA backed by Supabase and Razorpay.

## Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set the public Supabase URL/anon key and app URL in `.env.local`. Values under the Server-only heading in `.env.example` must never use a `NEXT_PUBLIC_` prefix or be committed.

## Supabase migration and storage order

1. Apply `supabase/schema.sql` to a new project.
2. Apply `supabase/migrations/001_hardening.sql` through `010_order_state_machine.sql` in numeric order.
3. Apply `supabase/storage-policies.sql` after the schema so its cleanup triggers are installed.
4. Seed only non-production test data with `supabase/seed.sql` after replacing its Auth user IDs.

Storage buckets are public for reads only: `avatars`, `reviews`, `restaurants`, and `banners`. Their write policies enforce user-folder ownership, restaurant ownership, or admin access. Create the buckets and apply the policies before enabling uploads.

## Auth and payments

Supabase Auth provides identity; `profiles.role` controls customer, store, delivery, and admin access. Do not trust role or ownership values supplied by a browser.

Razorpay requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` on the server. Configure the webhook URL as `https://your-domain/api/webhooks/razorpay`, subscribe to payment events, and keep the webhook secret distinct from the API secret. Client checkout uses only `NEXT_PUBLIC_RAZORPAY_KEY_ID`.

## Verification

```bash
npm test
npm run test:pricing
npx tsc --noEmit
npm run lint
npm run build
```

`npm test` validates the manifest and runs the integration suite. The integration tests are intentionally skipped until all `INTEGRATION_*` variables are set and a dedicated local/staging app is running at `INTEGRATION_BASE_URL`; they create and remove their own fixture rows. Never point them at production.
