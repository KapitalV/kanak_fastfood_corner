-- ============================================================
-- Kanak Foods — Production Schema V1.0
-- Run this in Supabase SQL Editor (idempotent)
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.user_role as enum ('customer', 'delivery', 'store', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'razorpay', 'cod', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('placed', 'accepted', 'preparing', 'ready', 'assigned', 'picked', 'in_transit', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_task_status as enum ('assigned', 'accepted', 'picked', 'in_transit', 'delivered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('flat', 'percent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.address_label as enum ('Home', 'Work', 'Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('order', 'promo', 'system');
exception when duplicate_object then null; end $$;

-- ─── HELPER FUNCTION ──────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── PROFILES ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  avatar_url    text,
  gender        text check (gender in ('male', 'female', 'other')),
  dob           date,
  role          public.user_role not null default 'customer',
  wallet_balance numeric(10,2) not null default 0 check (wallet_balance >= 0),
  reward_points  integer not null default 0,
  referral_code  text unique,
  is_active      boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles add column if not exists is_available boolean not null default true;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ─── RESTAURANTS ─────────────────────────────────────────────────────────────

create table if not exists public.restaurants (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  name                text not null,
  description         text,
  address             text not null,
  lat                 numeric,
  lng                 numeric,
  is_open             boolean not null default true,
  is_approved         boolean not null default false,
  delivery_radius_km  numeric not null default 5,
  min_order_amount    numeric(10,2) not null default 0,
  delivery_fee        numeric(10,2) not null default 35,
  packaging_charge    numeric(10,2) not null default 10,
  avg_rating          numeric(3,2) not null default 0,
  total_reviews       integer not null default 0,
  cuisine_type        text,
  image_url           text,
  logo_url            text,
  phone               text,
  email               text,
  gstin               text,
  fssai               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists set_restaurants_updated_at on public.restaurants;
create trigger set_restaurants_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

create index if not exists restaurants_owner_idx on public.restaurants(owner_id);
create index if not exists restaurants_is_open_idx on public.restaurants(is_open);
create index if not exists restaurants_is_approved_idx on public.restaurants(is_approved);

-- ─── BUSINESS HOURS ──────────────────────────────────────────────────────────

create table if not exists public.business_hours (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week   integer not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  opens_at      time not null,
  closes_at     time not null,
  is_closed     boolean not null default false,
  unique (restaurant_id, day_of_week)
);

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(10,2) not null check (price >= 0),
  image_url     text,
  category      text,
  is_veg        boolean not null default false,
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists products_restaurant_idx on public.products(restaurant_id);
create index if not exists products_category_idx on public.products(category);

-- ─── ADDRESSES ───────────────────────────────────────────────────────────────

create table if not exists public.addresses (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  label                 public.address_label not null default 'Home',
  full_address          text not null,
  flat_no               text,
  landmark              text,
  lat                   numeric,
  lng                   numeric,
  delivery_instructions text,
  is_default            boolean not null default false,
  created_at            timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses(user_id);

-- ─── COUPONS ─────────────────────────────────────────────────────────────────

create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  description      text not null,
  discount_type    public.discount_type not null,
  discount_value   numeric(10,2) not null check (discount_value > 0),
  min_order_amount numeric(10,2) not null default 0,
  max_discount     numeric(10,2),
  max_uses         integer,
  used_count       integer not null default 0,
  valid_from       timestamptz not null default now(),
  valid_until      timestamptz,
  restaurant_id    uuid references public.restaurants(id) on delete cascade,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists coupons_code_idx on public.coupons(code);
create index if not exists coupons_restaurant_idx on public.coupons(restaurant_id);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  customer_id           uuid not null references public.profiles(id) on delete cascade,
  restaurant_id         uuid not null references public.restaurants(id) on delete restrict,
  total_amount          numeric(10,2) not null,
  subtotal              numeric(10,2) not null default 0,
  delivery_fee          numeric(10,2) not null default 0,
  tax_amount            numeric(10,2) not null default 0,
  packaging_charge      numeric(10,2) not null default 0,
  platform_fee          numeric(10,2) not null default 0,
  tip_amount            numeric(10,2) not null default 0,
  coupon_id             uuid references public.coupons(id),
  coupon_discount       numeric(10,2) not null default 0,
  payment_method        text not null default 'cod' check (payment_method in ('razorpay', 'cod')),
  payment_status        public.payment_status not null default 'pending',
  razorpay_order_id     text,
  razorpay_payment_id   text,
  order_status          public.order_status not null default 'placed',
  delivery_address      text not null,
  delivery_lat          numeric,
  delivery_lng          numeric,
  delivery_instructions text,
  delivery_boy_id       uuid references public.profiles(id),
  special_instructions  text,
  cancelled_reason      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_restaurant_idx on public.orders(restaurant_id);
create index if not exists orders_delivery_boy_idx on public.orders(delivery_boy_id);
create index if not exists orders_status_idx on public.orders(order_status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ─── ORDER ITEMS ─────────────────────────────────────────────────────────────

create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete restrict,
  name_snapshot  text not null,
  price_snapshot numeric(10,2) not null,
  image_snapshot text,
  quantity       integer not null check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ─── DELIVERY TASKS ───────────────────────────────────────────────────────────

create table if not exists public.delivery_tasks (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references public.orders(id) on delete cascade,
  delivery_boy_id uuid not null references public.profiles(id) on delete cascade,
  status         public.delivery_task_status not null default 'assigned',
  assigned_at    timestamptz not null default now(),
  accepted_at    timestamptz,
  picked_at      timestamptz,
  in_transit_at  timestamptz,
  delivered_at   timestamptz
);

create index if not exists delivery_tasks_delivery_boy_idx on public.delivery_tasks(delivery_boy_id);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────

create table if not exists public.reviews (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null unique references public.orders(id) on delete cascade,
  customer_id           uuid not null references public.profiles(id) on delete cascade,
  restaurant_id         uuid not null references public.restaurants(id) on delete cascade,
  food_rating           integer not null check (food_rating between 1 and 5),
  restaurant_rating     integer not null check (restaurant_rating between 1 and 5),
  delivery_rating       integer check (delivery_rating between 1 and 5),
  comment               text,
  images                text[] not null default '{}',
  restaurant_reply      text,
  restaurant_replied_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create index if not exists reviews_restaurant_idx on public.reviews(restaurant_id);
create index if not exists reviews_customer_idx on public.reviews(customer_id);

-- Auto-update restaurant avg_rating when review added/updated
create or replace function public.update_restaurant_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.restaurants
  set
    avg_rating = (
      select coalesce(avg(restaurant_rating), 0)
      from public.reviews
      where restaurant_id = coalesce(new.restaurant_id, old.restaurant_id)
    ),
    total_reviews = (
      select count(*)
      from public.reviews
      where restaurant_id = coalesce(new.restaurant_id, old.restaurant_id)
    )
  where id = coalesce(new.restaurant_id, old.restaurant_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_review_change on public.reviews;
create trigger on_review_change
after insert or update or delete on public.reviews
for each row execute function public.update_restaurant_rating();

-- ─── BANNERS ─────────────────────────────────────────────────────────────────

create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text,
  image_url   text not null,
  link_url    text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null,
  type       public.notification_type not null default 'system',
  data       jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, is_read);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.business_hours enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_tasks enable row level security;
alter table public.reviews enable row level security;
alter table public.banners enable row level security;
alter table public.notifications enable row level security;

-- Helper: current user role
create or replace function public.current_role()
returns public.user_role language sql stable security definer
set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── Profiles ──
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid() or public.current_role() = 'admin' or role = 'delivery'
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert with check (
  id = auth.uid() or public.current_role() = 'admin'
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
using (id = auth.uid() or public.current_role() = 'admin')
with check (id = auth.uid() or public.current_role() = 'admin');

-- ── Restaurants ──
drop policy if exists "restaurants_public_read" on public.restaurants;
create policy "restaurants_public_read" on public.restaurants for select using (true);

drop policy if exists "restaurants_owner_write" on public.restaurants;
create policy "restaurants_owner_write" on public.restaurants for all
using (owner_id = auth.uid() or public.current_role() = 'admin')
with check (owner_id = auth.uid() or public.current_role() = 'admin');

-- ── Business Hours ──
drop policy if exists "business_hours_public_read" on public.business_hours;
create policy "business_hours_public_read" on public.business_hours for select using (true);

drop policy if exists "business_hours_owner_write" on public.business_hours;
create policy "business_hours_owner_write" on public.business_hours for all
using (
  public.current_role() = 'admin' or
  exists (select 1 from public.restaurants r where r.id = business_hours.restaurant_id and r.owner_id = auth.uid())
)
with check (
  public.current_role() = 'admin' or
  exists (select 1 from public.restaurants r where r.id = business_hours.restaurant_id and r.owner_id = auth.uid())
);

-- ── Products ──
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select using (true);

drop policy if exists "products_store_write" on public.products;
create policy "products_store_write" on public.products for all
using (
  public.current_role() = 'admin' or
  exists (select 1 from public.restaurants r where r.id = products.restaurant_id and r.owner_id = auth.uid())
)
with check (
  public.current_role() = 'admin' or
  exists (select 1 from public.restaurants r where r.id = products.restaurant_id and r.owner_id = auth.uid())
);

-- ── Addresses ──
drop policy if exists "addresses_self" on public.addresses;
create policy "addresses_self" on public.addresses for all
using (user_id = auth.uid() or public.current_role() = 'admin')
with check (user_id = auth.uid() or public.current_role() = 'admin');

-- ── Coupons ──
drop policy if exists "coupons_public_read" on public.coupons;
create policy "coupons_public_read" on public.coupons for select using (is_active = true);

drop policy if exists "coupons_admin_write" on public.coupons;
create policy "coupons_admin_write" on public.coupons for all
using (
  public.current_role() = 'admin' or
  (public.current_role() = 'store' and
   exists (select 1 from public.restaurants r where r.id = coupons.restaurant_id and r.owner_id = auth.uid()))
)
with check (
  public.current_role() = 'admin' or
  (public.current_role() = 'store' and
   exists (select 1 from public.restaurants r where r.id = coupons.restaurant_id and r.owner_id = auth.uid()))
);

-- ── Orders ──
drop policy if exists "orders_select_by_role" on public.orders;
create policy "orders_select_by_role" on public.orders for select using (
  customer_id = auth.uid() or
  delivery_boy_id = auth.uid() or
  public.current_role() = 'admin' or
  exists (select 1 from public.restaurants r where r.id = orders.restaurant_id and r.owner_id = auth.uid())
);

drop policy if exists "orders_customer_insert" on public.orders;
create policy "orders_customer_insert" on public.orders for insert with check (
  customer_id = auth.uid() or public.current_role() = 'admin'
);

drop policy if exists "orders_update_by_role" on public.orders;
create policy "orders_update_by_role" on public.orders for update
using (
  customer_id = auth.uid() or
  delivery_boy_id = auth.uid() or
  public.current_role() = 'admin' or
  exists (select 1 from public.restaurants r where r.id = orders.restaurant_id and r.owner_id = auth.uid())
)
with check (
  customer_id = auth.uid() or
  delivery_boy_id = auth.uid() or
  public.current_role() = 'admin' or
  exists (select 1 from public.restaurants r where r.id = orders.restaurant_id and r.owner_id = auth.uid())
);

-- ── Order Items ──
drop policy if exists "order_items_select_by_order" on public.order_items;
create policy "order_items_select_by_order" on public.order_items for select using (
  exists (
    select 1 from public.orders o where o.id = order_items.order_id and (
      o.customer_id = auth.uid() or
      o.delivery_boy_id = auth.uid() or
      public.current_role() = 'admin' or
      exists (select 1 from public.restaurants r where r.id = o.restaurant_id and r.owner_id = auth.uid())
    )
  )
);

drop policy if exists "order_items_customer_insert" on public.order_items;
create policy "order_items_customer_insert" on public.order_items for insert with check (
  exists (
    select 1 from public.orders o where o.id = order_items.order_id and
    (o.customer_id = auth.uid() or public.current_role() = 'admin')
  )
);

-- ── Delivery Tasks ──
drop policy if exists "delivery_tasks_select_by_role" on public.delivery_tasks;
create policy "delivery_tasks_select_by_role" on public.delivery_tasks for select using (
  delivery_boy_id = auth.uid() or
  public.current_role() = 'admin' or
  exists (
    select 1 from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.id = delivery_tasks.order_id and r.owner_id = auth.uid()
  )
);

drop policy if exists "delivery_tasks_store_insert" on public.delivery_tasks;
create policy "delivery_tasks_store_insert" on public.delivery_tasks for insert with check (
  public.current_role() = 'admin' or
  exists (
    select 1 from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.id = delivery_tasks.order_id and r.owner_id = auth.uid()
  )
);

drop policy if exists "delivery_tasks_delivery_update" on public.delivery_tasks;
create policy "delivery_tasks_delivery_update" on public.delivery_tasks for update
using (delivery_boy_id = auth.uid() or public.current_role() = 'admin')
with check (delivery_boy_id = auth.uid() or public.current_role() = 'admin');

-- ── Reviews ──
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews for select using (true);

drop policy if exists "reviews_customer_insert" on public.reviews;
create policy "reviews_customer_insert" on public.reviews for insert with check (
  customer_id = auth.uid()
);

drop policy if exists "reviews_customer_update" on public.reviews;
create policy "reviews_customer_update" on public.reviews for update
using (customer_id = auth.uid() or
  exists (select 1 from public.restaurants r where r.id = reviews.restaurant_id and r.owner_id = auth.uid()) or
  public.current_role() = 'admin')
with check (customer_id = auth.uid() or
  exists (select 1 from public.restaurants r where r.id = reviews.restaurant_id and r.owner_id = auth.uid()) or
  public.current_role() = 'admin');

drop policy if exists "reviews_customer_delete" on public.reviews;
create policy "reviews_customer_delete" on public.reviews for delete
using (customer_id = auth.uid() or public.current_role() = 'admin');

-- ── Banners ──
drop policy if exists "banners_public_read" on public.banners;
create policy "banners_public_read" on public.banners for select using (is_active = true);

drop policy if exists "banners_admin_write" on public.banners;
create policy "banners_admin_write" on public.banners for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

-- ── Notifications ──
drop policy if exists "notifications_self" on public.notifications;
create policy "notifications_self" on public.notifications for all
using (user_id = auth.uid() or public.current_role() = 'admin')
with check (user_id = auth.uid() or public.current_role() = 'admin');

-- ─── REALTIME PUBLICATIONS ────────────────────────────────────────────────────

do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.delivery_tasks;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null; end;
end $$;

-- ─── AUTO-GENERATE REFERRAL CODE ON PROFILE INSERT ────────────────────────────

create or replace function public.generate_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_insert_referral on public.profiles;
create trigger on_profile_insert_referral
before insert on public.profiles
for each row execute function public.generate_referral_code();

-- ─── NOTE ON STORAGE BUCKETS ─────────────────────────────────────────────────
-- Run these in the Supabase Storage section or SQL:
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('restaurants', 'restaurants', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('reviews', 'reviews', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('banners', 'banners', true) on conflict do nothing;

-- ─── RESTAURANT EARNINGS ────────────────────────────────────────────────────

create table if not exists public.restaurant_earnings (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id      uuid not null unique references public.orders(id) on delete cascade,
  gross_amount  numeric(10,2) not null default 0 check (gross_amount >= 0),
  platform_fee  numeric(10,2) not null default 0 check (platform_fee >= 0),
  net_amount    numeric(10,2) not null default 0 check (net_amount >= 0),
  status        text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists restaurant_earnings_restaurant_idx
  on public.restaurant_earnings(restaurant_id, created_at desc);

alter table public.restaurant_earnings enable row level security;

drop policy if exists "restaurant_earnings_owner_read" on public.restaurant_earnings;
create policy "restaurant_earnings_owner_read" on public.restaurant_earnings for select using (
  public.current_role() = 'admin' or exists (
    select 1 from public.restaurants r
    where r.id = restaurant_earnings.restaurant_id and r.owner_id = auth.uid()
  )
);

-- Keep earnings derived from completed orders. This trigger is intentionally
-- server-side so a client cannot assign itself arbitrary revenue.
create or replace function public.sync_restaurant_earning()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.order_status = 'delivered' then
    insert into public.restaurant_earnings (restaurant_id, order_id, gross_amount, platform_fee, net_amount, status)
    values (new.restaurant_id, new.id, new.subtotal, new.platform_fee, greatest(new.subtotal - new.platform_fee, 0), 'pending')
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
