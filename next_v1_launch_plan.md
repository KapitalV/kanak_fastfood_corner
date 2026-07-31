# Kanak Foods V1 Launch Implementation Plan

Status: Planning only — no implementation or deployment actions are performed by this document.

Date: 2026-07-29

Project: `D:\My project\Kanak food store\WEB`

## 1. Launch objective

Launch a controlled V1 of Kanak Foods as a production food-ordering web app with:

- Customer registration, login, OTP option, restaurant discovery, cart, coupons, checkout, COD, and Razorpay payments.
- Customer order tracking, notifications, reorder, invoice download, addresses, and reviews.
- Store order/menu operations, delivery assignment, analytics, restaurant hours, and earnings.
- Delivery partner task management, availability, history, map links, and earnings.
- Admin restaurant approval, users, orders, coupons, banners, and operational metrics.
- Supabase Auth, Postgres, RLS, Storage, Realtime, Razorpay, PWA offline fallback, monitoring, backups, and rollback procedures.

## 2. Current baseline before launch work

The repository currently builds successfully and runs locally on port 8888. Before beginning launch work, record a clean baseline:

```powershell
cd "D:\My project\Kanak food store\WEB"
npm install
npx tsc --noEmit
npm run lint
npm run build
npm run start -- -p 8888
```

Confirm:

- `http://localhost:8888` returns HTTP 200.
- The production build is used for release testing, not only `next dev`.
- No real production secrets exist in the repository.
- A backup copy of the current code and database configuration is stored before migration work.

## 3. Release environments

Create three separate environments:

| Environment | Purpose | Database | Payments |
|---|---|---|---|
| Local | Developer work | Local/test Supabase project | Razorpay test keys |
| Staging | Full acceptance testing | Dedicated staging Supabase project | Razorpay test keys/webhooks |
| Production | Real users | Production Supabase project | Razorpay live keys/webhooks |

Never use the production database or live payment keys for local testing.

## 4. Required ownership and access

Before implementation, assign owners for:

- Product decisions and launch approval.
- Frontend and backend changes.
- Supabase database, Auth, RLS, Realtime, and Storage.
- Razorpay account, webhooks, refunds, and reconciliation.
- Hosting, DNS, SSL, environment secrets, and deployment.
- Customer support and incident response.

Use separate accounts for development and production. Enable MFA for Supabase, Razorpay, hosting, email, SMS, and source-control accounts.

## 5. Required production secrets

Configure these in the hosting provider's secret manager, not in Git:

```env
NEXT_PUBLIC_SUPABASE_URL=https://production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=production-secret
RAZORPAY_WEBHOOK_SECRET=production-webhook-secret
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
NEXT_PUBLIC_APP_URL=https://your-production-domain.example
```

Rules:

- Never expose `RAZORPAY_KEY_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Never commit `.env`, `.env.local`, production exports, service-role keys, or webhook secrets.
- Rotate test secrets before production launch.
- Record where every secret is stored and who can rotate it.

## 6. Database implementation sequence

### 6.1 Create the production project

1. Create a new Supabase production project in the correct region.
2. Enable database backups and point-in-time recovery if available.
3. Record the project reference and API URL.
4. Confirm database timezone and application currency are correct.

### 6.2 Apply schema safely

1. Treat `WEB/supabase/schema.sql` as the source schema.
2. Review every statement against the staging database first.
3. Convert future changes into numbered migrations, for example:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_restaurant_earnings.sql
supabase/migrations/003_product_variants.sql
```

4. Apply migrations to staging.
5. Run schema validation queries.
6. Back up production before applying production migrations.
7. Apply the same migrations to production.

### 6.3 Validate required tables

Confirm these tables exist:

- `profiles`
- `restaurants`
- `business_hours`
- `products`
- `addresses`
- `coupons`
- `orders`
- `order_items`
- `delivery_tasks`
- `reviews`
- `banners`
- `notifications`
- `restaurant_earnings`

Confirm required triggers/functions exist:

- Profile updated-at trigger.
- Referral-code trigger.
- Review rating aggregate trigger.
- Restaurant earning trigger on delivered orders.
- `current_role()` helper.

### 6.4 Add missing V1 schema before launch

Decide whether these are required for the first public release:

- Product variants and add-ons.
- Notification preferences.
- Refund records.
- Payment events/audit log.
- Delivery payout ledger.
- Support tickets.

If required, add them as migrations with types, indexes, constraints, RLS policies, seed data, and rollback notes before staging acceptance.

## 7. RLS and authorization verification

Test every table with four real test accounts:

### Customer

- Can read approved restaurants, available products, active coupons, active banners, and public reviews.
- Can read/write only their own profile and addresses.
- Can create/read/update permitted own orders.
- Cannot read another customer's orders, addresses, notifications, or payment data.
- Cannot update restaurant, product, coupon, banner, delivery, or earnings records.

### Store owner

- Can read and update only owned restaurants/products/business hours.
- Can read only orders for owned restaurants.
- Can assign delivery partners according to policy.
- Can read owned restaurant reviews and reply where implemented.
- Cannot read another store's orders, products, or earnings.

### Delivery partner

- Can read only assigned delivery tasks.
- Can update only allowed task states for assigned tasks.
- Can read only delivery-related order information.
- Can update own availability.
- Cannot edit customer totals, coupons, restaurant data, or earnings.

### Admin

- Can perform explicitly documented operational actions.
- Admin actions are audited where possible.
- Admin access is granted manually, never from public registration.

Create a written RLS test record with the query, role, expected result, actual result, and date.

## 8. Supabase Auth setup

### Email authentication

1. Configure production Site URL.
2. Add production reset-password redirect URL.
3. Configure SMTP/email provider.
4. Set sender name and sender address.
5. Test registration, email confirmation, login, logout, forgot password, and reset password.

### Phone OTP

1. Enable phone authentication.
2. Configure Twilio or the selected SMS provider.
3. Configure rate limits and SMS budget alerts.
4. Test OTP send, verification, expired OTP, invalid OTP, repeated requests, and international number handling.

### Account lifecycle

Test:

- Password change.
- Account deletion request.
- Session invalidation after deletion.
- Expired session handling.
- Role change and deactivated account handling.

## 9. Storage setup

Create and configure these buckets only if the related feature is enabled:

- `avatars`
- `reviews`
- `restaurants`
- `banners`

For every bucket define:

- Public or private visibility.
- Maximum file size.
- Allowed MIME types.
- Object path convention.
- Upload policy.
- Read policy.
- Update/delete policy.
- Cleanup policy for deleted records.

Recommended object paths:

```text
avatars/{user_id}/{file_name}
reviews/{user_id}/{order_id}/{file_name}
restaurants/{restaurant_id}/{file_name}
banners/{banner_id}/{file_name}
```

Test malicious file extensions, oversized files, unauthorized reads, unauthorized deletes, and deleted-user cleanup.

## 10. Payment launch sequence

### 10.1 Razorpay account

1. Complete business/KYC requirements.
2. Configure test and live modes separately.
3. Add bank settlement details.
4. Define refund and dispute ownership.
5. Configure webhook endpoint on staging.
6. Verify webhook signatures.
7. Repeat for production with the production domain.

### 10.2 Payment scenarios

Test in staging:

- Successful card payment.
- Successful UPI payment.
- Payment cancelled by user.
- Payment failure.
- Browser refresh during payment.
- Duplicate callback.
- Delayed webhook.
- Webhook before client callback.
- Mismatched amount.
- Mismatched order ID.
- Replayed webhook.
- Refund and refunded webhook.
- COD order.

### 10.3 Payment invariants

The server must always:

- Authenticate the customer.
- Load prices from the database.
- Recalculate subtotal, tax, delivery, packaging, platform fee, tip, and coupon discount.
- Verify the order belongs to the customer.
- Reject duplicate products and unavailable products.
- Reject a client-supplied total that differs from the server total.
- Verify Razorpay HMAC signatures with constant-time comparison.
- Make payment updates idempotent.
- Record payment IDs and event status.

Reconcile the first live orders manually against Razorpay and Supabase before scaling traffic.

## 11. Backend and API hardening

Review every API route for:

- Authentication.
- Input validation with Zod.
- Authorization by resource ownership.
- Rate limiting.
- Safe error messages.
- Structured server logs without secrets.
- Idempotency for payment/order operations.
- Maximum request body size.
- Timeout handling.
- Database transaction or compensating cleanup on partial failure.

Required API tests:

```text
POST /api/orders
POST /api/razorpay/create-order
POST /api/razorpay/verify-payment
POST /api/webhooks/razorpay
DELETE /api/account/delete
```

Add automated tests for valid requests, invalid schemas, missing sessions, wrong owner, replayed requests, and database failures.

## 12. Customer acceptance scope

Complete and test these workflows in staging:

1. Customer registration → email verification → login.
2. Customer OTP login.
3. Search restaurant and dish.
4. Filter by open and vegetarian availability.
5. Open restaurant and browse category menu.
6. Add items and change quantities.
7. Apply valid, invalid, expired, minimum-order, percentage, and flat coupons.
8. Add/select/delete address.
9. Place COD order.
10. Place Razorpay test order.
11. View live order status.
12. Cancel order before acceptance.
13. Reorder delivered items.
14. Download invoice.
15. Submit delivered-order review with image.
16. View restaurant reviews.
17. Read and mark notifications.
18. Change password and delete account in a test account.

## 13. Store acceptance scope

1. Store account sees only owned restaurants.
2. Store opens/closes restaurant.
3. Store edits business hours.
4. Store creates and updates menu items.
5. Store marks items unavailable.
6. Store receives order realtime update.
7. Store progresses placed → preparing → ready.
8. Store assigns a delivery partner.
9. Store sees analytics and delivered-order earnings.
10. Store manages coupons where permitted.
11. Store can view and reply to reviews after reply UI is enabled.

## 14. Delivery acceptance scope

1. Delivery account sees only assigned tasks.
2. Delivery partner can go online/offline.
3. Delivery partner progresses assigned → accepted → picked → in transit → delivered.
4. Customer order status changes with delivery status.
5. Delivery partner can open the delivery address in maps.
6. Delivery history is visible.
7. Earnings and tips reconcile with delivered orders.
8. Delivery partner cannot modify another partner's task.

## 15. Admin acceptance scope

1. Admin login works and is not publicly self-assignable.
2. Admin dashboard metrics load.
3. Admin approves/revokes restaurants.
4. Admin activates/deactivates coupons.
5. Admin creates/hides banners.
6. Admin reviews users, restaurants, and orders.
7. Admin actions are denied for non-admin accounts.
8. Admin can support refunds and disputes through a documented operational process.

## 16. UX, accessibility, and mobile QA

Test viewports:

- 375 × 812 mobile.
- 390 × 844 mobile.
- 768 × 1024 tablet.
- 1280 × 800 desktop.
- 1440 × 900 desktop.

Check:

- Keyboard navigation.
- Visible focus states.
- Form labels and error messages.
- Button disabled/loading states.
- Screen-reader names for icon buttons.
- Color contrast.
- Long restaurant names and addresses.
- Slow network behavior.
- Empty/loading/error states.
- Offline navigation and service-worker fallback.
- No horizontal overflow.

Resolve raw image warnings by migrating external image rendering to `next/image` or documenting why a raw image is intentional.

## 17. Performance and reliability

Before launch measure:

- Largest Contentful Paint.
- Cumulative Layout Shift.
- Interaction to Next Paint.
- Initial JavaScript payload.
- Restaurant page image weight.
- Search query latency.
- Checkout API latency.

Add indexes for:

- `restaurants(is_approved, avg_rating)`.
- `products(restaurant_id, is_available, sort_order)`.
- `orders(customer_id, created_at)`.
- `orders(restaurant_id, order_status)`.
- `orders(delivery_boy_id, order_status)`.
- `notifications(user_id, is_read, created_at)`.
- `restaurant_earnings(restaurant_id, created_at)`.

Set monitoring alerts for:

- HTTP 5xx errors.
- Payment verification failures.
- Webhook failures.
- Database connection errors.
- Slow API responses.
- Authentication failures.
- Storage failures.

## 18. Staging deployment

1. Create staging hosting project.
2. Configure staging environment variables.
3. Apply staging database migrations.
4. Configure staging Auth redirect URLs.
5. Configure staging Storage buckets and policies.
6. Configure Razorpay test webhook.
7. Deploy a release candidate.
8. Run all customer, store, delivery, admin, payment, RLS, mobile, and offline acceptance tests.
9. Fix all P0/P1 defects.
10. Record a staging sign-off with commit hash, migration version, test results, and known limitations.

## 19. Production deployment

### Release preparation

- Freeze feature changes.
- Review the change list.
- Review environment variables.
- Back up production database.
- Confirm rollback commit.
- Confirm rollback migration or restore plan.
- Confirm support contact and incident owner.
- Confirm Razorpay live webhook endpoint.

### Deployment order

1. Put the release commit/tag in source control.
2. Apply backward-compatible database migrations.
3. Verify migration success.
4. Deploy the application.
5. Verify health endpoint/home page.
6. Verify login and a read-only restaurant page.
7. Verify a small COD test order with a staff account.
8. Verify Razorpay configuration without creating a real customer charge unless approved.
9. Verify notification and realtime connections.
10. Enable public traffic.

### Production smoke tests

- Home page HTTP 200.
- Login.
- Restaurant list.
- Restaurant detail.
- Cart.
- Checkout page.
- COD test with internal account.
- Admin dashboard.
- Store dashboard.
- Delivery dashboard.
- Notification inbox.
- Offline page.

## 20. Rollback plan

If the release causes errors:

1. Stop new payment traffic if payment integrity is affected.
2. Disable the affected feature with a feature flag or route guard.
3. Roll back the application to the last known-good release.
4. Do not automatically roll back destructive database migrations.
5. Restore the database only after confirming data-loss impact.
6. Reconcile any payment callbacks received during the incident.
7. Notify internal operators and affected customers.
8. Record the incident, timeline, root cause, and corrective action.

## 21. Post-launch operating checklist

Daily during the first week:

- Check errors and slow requests.
- Check payment/webhook reconciliation.
- Check failed orders and stuck statuses.
- Check delivery task mismatches.
- Check notification failures.
- Check database/storage usage.
- Review customer support tickets.

Weekly:

- Review RLS and admin access.
- Review failed payments/refunds.
- Review restaurant approval and menu quality.
- Review backups and restore readiness.
- Rotate temporary test accounts and secrets.
- Review performance metrics.

## 22. Launch exit criteria

Do not declare V1 launched until all are true:

- [ ] Staging acceptance checklist passes.
- [ ] Production database backup exists.
- [ ] Production migrations are recorded.
- [ ] RLS tests pass for customer, store, delivery, and admin.
- [ ] Payment success/failure/replay/refund tests pass.
- [ ] Razorpay webhook is verified.
- [ ] Storage policies are verified.
- [ ] Auth redirects and email/SMS providers work.
- [ ] Production smoke tests pass.
- [ ] Monitoring and alerts are active.
- [ ] Rollback release is identified.
- [ ] Support and incident contacts are assigned.
- [ ] Product owner signs off on known limitations.

## 23. Known V1 limitations to approve explicitly

Before launch, the product owner must explicitly approve or reject:

- Whether product variants/add-ons are included in V1.
- Whether invoice download is text-based or must be PDF.
- Whether email/push notifications are required on day one.
- Whether delivery earnings are tips-only or include a formal payout rate.
- Whether restaurant reply management is required before launch.
- Whether account deletion is immediate or support-reviewed.
- Whether admin actions require an audit log before launch.

Any rejected requirement must be moved into a dated V1.1 backlog, not left ambiguous.

