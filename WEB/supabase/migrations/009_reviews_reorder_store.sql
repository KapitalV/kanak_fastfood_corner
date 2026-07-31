-- ============================================================
-- Migration 009: Reviews constraint + cancellation rules
-- Supports backlog items 1, 3, 5
-- ============================================================

-- ── Ensure one-review-per-order at DB level ──────────────────────────────────
-- The schema already has `unique` on reviews.order_id via the column definition,
-- but we add a named constraint explicitly for clarity and idempotency.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_one_per_order' and conrelid = 'public.reviews'::regclass
  ) then
    -- The existing unique constraint from CREATE TABLE covers this.
    -- If somehow it's missing, add it:
    begin
      alter table public.reviews add constraint reviews_one_per_order unique (order_id);
    exception when duplicate_table then null;
    end;
  end if;
end $$;

-- ── Add accepted status to store transitions ─────────────────────────────────
-- The order_status enum already includes 'accepted' from migration 007.
-- No DDL changes needed; the transition logic is in the API route.

-- ── Index for earnings queries (store analytics) ─────────────────────────────
create index if not exists restaurant_earnings_status_idx
  on public.restaurant_earnings(restaurant_id, status);
