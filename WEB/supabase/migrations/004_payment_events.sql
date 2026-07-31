-- Phase 1 / Migration 004: payment webhook idempotency foundation.
-- Rollback: drop table public.payment_events.

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_event_id text not null unique,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_order_idx on public.payment_events(order_id, created_at desc);
alter table public.payment_events enable row level security;
drop policy if exists payment_events_admin_all on public.payment_events;
create policy payment_events_admin_all on public.payment_events for all
using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ROLLBACK
-- Drop public.payment_events only after retaining any payment audit/idempotency records required for reconciliation.
