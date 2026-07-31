-- Phase 1 / Migration 005: business hours.
-- The bootstrap schema already contains business_hours, so this migration is intentionally a no-op.
-- Rollback: no action.

do $$
declare
  created_now boolean := false;
begin
  if to_regclass('public.business_hours') is null then
    create table public.business_hours (
      id uuid primary key default gen_random_uuid(),
      restaurant_id uuid not null references public.restaurants(id) on delete cascade,
      day_of_week integer not null check (day_of_week between 0 and 6),
      opens_at time not null,
      closes_at time not null,
      is_closed boolean not null default false,
      unique (restaurant_id, day_of_week)
    );
    alter table public.business_hours enable row level security;
    created_now := true;
  end if;
  if created_now then
    execute 'create policy business_hours_owner_read on public.business_hours for select using (public.current_role() = ''admin'' or exists (select 1 from public.restaurants r where r.id = business_hours.restaurant_id and r.owner_id = auth.uid()))';
    execute 'create policy business_hours_owner_write on public.business_hours for all using (public.current_role() = ''admin'' or exists (select 1 from public.restaurants r where r.id = business_hours.restaurant_id and r.owner_id = auth.uid())) with check (public.current_role() = ''admin'' or exists (select 1 from public.restaurants r where r.id = business_hours.restaurant_id and r.owner_id = auth.uid()))';
  end if;
end $$;

-- ROLLBACK
-- No action when business_hours already existed; otherwise drop only the table created by this migration after dependency review.
