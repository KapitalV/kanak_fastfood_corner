-- Phase 1 / Migration 002: normalized product variants and add-ons.
-- Rollback: drop table public.product_addon_links, then product_addons and product_variants.
-- Review dependent data before rollback; this removes catalog extension data.

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price_delta numeric(10,2) not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

create table if not exists public.product_addons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table if not exists public.product_addon_links (
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  product_addon_id uuid not null references public.product_addons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_variant_id, product_addon_id)
);

alter table public.product_variants enable row level security;
alter table public.product_addons enable row level security;
alter table public.product_addon_links enable row level security;

drop policy if exists product_variants_read on public.product_variants;
create policy product_variants_read on public.product_variants for select using (public.current_role() = 'admin' or exists (
  select 1 from public.products p join public.restaurants r on r.id = p.restaurant_id
  where p.id = product_variants.product_id and r.owner_id = auth.uid()
));
drop policy if exists product_variants_owner_write on public.product_variants;
create policy product_variants_owner_write on public.product_variants for all
using (public.current_role() = 'admin' or exists (
  select 1 from public.products p join public.restaurants r on r.id = p.restaurant_id
  where p.id = product_variants.product_id and r.owner_id = auth.uid()
)) with check (public.current_role() = 'admin' or exists (
  select 1 from public.products p join public.restaurants r on r.id = p.restaurant_id
  where p.id = product_variants.product_id and r.owner_id = auth.uid()
));

drop policy if exists product_addons_read on public.product_addons;
create policy product_addons_read on public.product_addons for select using (public.current_role() = 'admin' or exists (
  select 1 from public.restaurants r where r.id = product_addons.restaurant_id and r.owner_id = auth.uid()
));
drop policy if exists product_addons_owner_write on public.product_addons;
create policy product_addons_owner_write on public.product_addons for all
using (public.current_role() = 'admin' or exists (
  select 1 from public.restaurants r where r.id = product_addons.restaurant_id and r.owner_id = auth.uid()
)) with check (public.current_role() = 'admin' or exists (
  select 1 from public.restaurants r where r.id = product_addons.restaurant_id and r.owner_id = auth.uid()
));

drop policy if exists product_addon_links_read on public.product_addon_links;
create policy product_addon_links_read on public.product_addon_links for select using (public.current_role() = 'admin' or exists (
  select 1 from public.product_variants v join public.products p on p.id = v.product_id
  join public.restaurants r on r.id = p.restaurant_id
  where v.id = product_addon_links.product_variant_id and r.owner_id = auth.uid()
));
drop policy if exists product_addon_links_owner_write on public.product_addon_links;
create policy product_addon_links_owner_write on public.product_addon_links for all
using (public.current_role() = 'admin' or exists (
  select 1 from public.product_variants v join public.products p on p.id = v.product_id
  join public.restaurants r on r.id = p.restaurant_id
  where v.id = product_addon_links.product_variant_id and r.owner_id = auth.uid()
)) with check (public.current_role() = 'admin' or exists (
  select 1 from public.product_variants v join public.products p on p.id = v.product_id
  join public.restaurants r on r.id = p.restaurant_id
 where v.id = product_addon_links.product_variant_id and r.owner_id = auth.uid()
));

-- ROLLBACK
-- Drop product_addon_links, product_addons, then product_variants after reviewing dependent data.
