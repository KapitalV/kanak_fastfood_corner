-- Kanak Food Store migration 001: server-side order and earnings hardening.
-- Rollback notes (manual, after checking dependent code):
--   drop trigger if exists orders_prevent_customer_tampering on public.orders;
--   drop function if exists public.prevent_customer_order_tampering();
--   drop trigger if exists on_order_earning_change on public.orders;
--   drop function if exists public.sync_restaurant_earning();
--   drop table if exists public.restaurant_earnings;
-- This migration is additive and must not be edited after application.

create table if not exists public.restaurant_earnings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  gross_amount numeric(10,2) not null default 0 check (gross_amount >= 0),
  platform_fee numeric(10,2) not null default 0 check (platform_fee >= 0),
  net_amount numeric(10,2) not null default 0 check (net_amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_earnings_restaurant_idx
  on public.restaurant_earnings(restaurant_id, created_at desc);
alter table public.restaurant_earnings enable row level security;
drop policy if exists restaurant_earnings_owner_read on public.restaurant_earnings;
create policy restaurant_earnings_owner_read on public.restaurant_earnings for select using (
  public.current_role() = 'admin' or exists (
    select 1 from public.restaurants r
    where r.id = restaurant_earnings.restaurant_id and r.owner_id = auth.uid()
  )
);

create or replace function public.sync_restaurant_earning()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.order_status in ('delivered', 'paid') then
    insert into public.restaurant_earnings (restaurant_id, order_id, gross_amount, platform_fee, net_amount)
    values (new.restaurant_id, new.id, new.subtotal, new.platform_fee, greatest(new.subtotal - new.platform_fee, 0))
    on conflict (order_id) do update set
      gross_amount = excluded.gross_amount,
      platform_fee = excluded.platform_fee,
      net_amount = excluded.net_amount;
  elsif new.order_status = 'cancelled' then
    update public.restaurant_earnings set status = 'cancelled' where order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_earning_change on public.orders;
create trigger on_order_earning_change after insert or update of order_status on public.orders
for each row execute function public.sync_restaurant_earning();

create or replace function public.prevent_customer_order_tampering()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() = 'customer' and old.customer_id = auth.uid() then
    if new.customer_id <> old.customer_id
      or new.restaurant_id <> old.restaurant_id
      or new.total_amount <> old.total_amount
      or new.subtotal <> old.subtotal
      or new.delivery_fee <> old.delivery_fee
      or new.tax_amount <> old.tax_amount
      or new.packaging_charge <> old.packaging_charge
      or new.platform_fee <> old.platform_fee
      or new.tip_amount <> old.tip_amount
      or new.coupon_id is distinct from old.coupon_id
      or new.coupon_discount <> old.coupon_discount
      or new.payment_method <> old.payment_method
      or new.payment_status <> old.payment_status
      or new.razorpay_order_id is distinct from old.razorpay_order_id
      or new.razorpay_payment_id is distinct from old.razorpay_payment_id
      or new.order_status not in (old.order_status, 'cancelled') then
      raise exception 'Customer cannot modify protected order fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_prevent_customer_tampering on public.orders;
create trigger orders_prevent_customer_tampering before update on public.orders
for each row execute function public.prevent_customer_order_tampering();

-- ROLLBACK
-- Review dependencies first; reverse only the objects introduced by this migration.
