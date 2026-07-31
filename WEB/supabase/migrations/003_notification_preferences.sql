-- Phase 1 / Migration 003: per-user notification preferences.
-- Rollback: drop table public.notification_preferences.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email boolean not null default true,
  push boolean not null default true,
  sms boolean not null default false,
  marketing boolean not null default false,
  order_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
drop policy if exists notification_preferences_self on public.notification_preferences;
create policy notification_preferences_self on public.notification_preferences for all
using (user_id = auth.uid() or public.current_role() = 'admin')
with check (user_id = auth.uid() or public.current_role() = 'admin');

-- ROLLBACK
-- Drop public.notification_preferences after confirming no preference data must be retained.
