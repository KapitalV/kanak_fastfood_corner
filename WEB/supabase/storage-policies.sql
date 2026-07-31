-- ============================================================
-- Kanak Foods — Storage Buckets & Policies
-- Supabase SQL Editor compatible. Idempotent: safe to re-run.
-- Self-contained: runs before OR after schema.sql.
--
-- Design decisions:
--   • No storage.* functions/triggers/procedures (forbidden).
--   • All helpers in the public schema, LANGUAGE plpgsql.
--     plpgsql defers table resolution to call-time, so CREATE
--     succeeds even if public.profiles / public.restaurants do
--     not exist yet.  EXCEPTION handlers return false (deny).
--   • RLS policies call helpers — not inline subqueries.
--     Inline SQL subqueries inside CREATE POLICY are validated
--     immediately and fail if the referenced table is absent.
--   • Cleanup triggers are wrapped in DO blocks so the script
--     does not abort when the target table is not yet created.
--     DROP TRIGGER IF EXISTS still requires the table to exist
--     in PostgreSQL — the DO wrapper catches that error cleanly.
-- ============================================================


-- ─── BUCKETS ──────────────────────────────────────────────────────────────────
-- avatars      public  2 MB  JPEG / PNG / WebP / GIF
-- reviews      public  5 MB  JPEG / PNG / WebP
-- restaurants  public  5 MB  JPEG / PNG / WebP
-- banners      public  5 MB  JPEG / PNG / WebP

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',     'avatars',     true, 2097152,
    array['image/jpeg','image/png','image/webp','image/gif']),
  ('reviews',     'reviews',     true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('restaurants', 'restaurants', true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('banners',     'banners',     true, 5242880,
    array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ─── HELPER: is the current user an admin? ────────────────────────────────────
-- plpgsql → table names resolved at runtime, not at CREATE time.
-- EXCEPTION guard → returns false (deny) when public.profiles is absent.

create or replace function public.storage_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from   public.profiles
    where  id         = auth.uid()
      and  role::text = 'admin'
  );
exception
  when undefined_table     then return false;
  when undefined_column    then return false;
  when invalid_schema_name then return false;
end;
$$;


-- ─── HELPER: is the caller the restaurant owner or an admin? ─────────────────
-- Same deferred-resolution / EXCEPTION pattern as storage_is_admin().

create or replace function public.storage_is_restaurant_owner_or_admin(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (
    -- admin short-circuit
    exists (
      select 1
      from   public.profiles
      where  id         = auth.uid()
        and  role::text = 'admin'
    )
    or
    -- owner: first path segment must be a restaurant owned by the caller
    exists (
      select 1
      from   public.restaurants r
      where  r.id       = (storage.foldername(object_name))[1]::uuid
        and  r.owner_id = auth.uid()
    )
  );
exception
  when undefined_table     then return false;
  when undefined_column    then return false;
  when invalid_schema_name then return false;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- AVATARS  —  path pattern: avatars/{user_id}/{filename}
-- ═══════════════════════════════════════════════════════════════════════════════

-- Blocks: unauthenticated uploads; writing into another user's folder.
drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Blocks: nothing — bucket is public; all reads are open.
drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- Blocks: overwriting a file in another user's folder.
drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Blocks: deleting files from another user's folder.
drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- REVIEWS  —  path pattern: reviews/{user_id}/{order_id}/{filename}
-- ═══════════════════════════════════════════════════════════════════════════════

-- Blocks: unauthenticated uploads; writing under another user's folder.
drop policy if exists "reviews_insert" on storage.objects;
create policy "reviews_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Blocks: nothing — review photos are publicly viewable.
drop policy if exists "reviews_select" on storage.objects;
create policy "reviews_select" on storage.objects
  for select to public
  using (bucket_id = 'reviews');

-- Blocks: overwriting review images belonging to another user.
drop policy if exists "reviews_update" on storage.objects;
create policy "reviews_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Blocks: deleting another user's review images.
drop policy if exists "reviews_delete" on storage.objects;
create policy "reviews_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- RESTAURANTS  —  path pattern: restaurants/{restaurant_id}/{filename}
-- Mutation allowed only to the restaurant's owner or an admin.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Blocks: unauthenticated uploads; non-owners uploading to a restaurant folder.
drop policy if exists "restaurants_insert" on storage.objects;
create policy "restaurants_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'restaurants'
    and public.storage_is_restaurant_owner_or_admin(name)
  );

-- Blocks: nothing — restaurant images are publicly viewable.
drop policy if exists "restaurants_select" on storage.objects;
create policy "restaurants_select" on storage.objects
  for select to public
  using (bucket_id = 'restaurants');

-- Blocks: non-owners overwriting restaurant images.
drop policy if exists "restaurants_update" on storage.objects;
create policy "restaurants_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'restaurants'
    and public.storage_is_restaurant_owner_or_admin(name)
  )
  with check (
    bucket_id = 'restaurants'
    and public.storage_is_restaurant_owner_or_admin(name)
  );

-- Blocks: non-owners deleting restaurant images.
drop policy if exists "restaurants_delete" on storage.objects;
create policy "restaurants_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'restaurants'
    and public.storage_is_restaurant_owner_or_admin(name)
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- BANNERS  —  path pattern: banners/{banner_id}/{filename}
-- All mutations restricted to admin role only.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Blocks: every non-admin upload.
drop policy if exists "banners_insert" on storage.objects;
create policy "banners_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'banners'
    and public.storage_is_admin()
  );

-- Blocks: nothing — banner images are publicly viewable.
drop policy if exists "banners_select" on storage.objects;
create policy "banners_select" on storage.objects
  for select to public
  using (bucket_id = 'banners');

-- Blocks: every non-admin overwrite.
drop policy if exists "banners_update" on storage.objects;
create policy "banners_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'banners'
    and public.storage_is_admin()
  )
  with check (
    bucket_id = 'banners'
    and public.storage_is_admin()
  );

-- Blocks: every non-admin delete.
drop policy if exists "banners_delete" on storage.objects;
create policy "banners_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'banners'
    and public.storage_is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP — public schema functions + triggers on public tables
--
-- Functions: public schema only (storage.* is forbidden).
-- security definer → runs as the function owner (postgres superuser)
--   so it can DELETE from storage.objects across schemas.
-- Supabase's storage worker then asynchronously removes the S3 files.
--
-- Each trigger block is wrapped in DO $$ … EXCEPTION WHEN undefined_table $$
-- because `DROP TRIGGER IF EXISTS … ON t` and `CREATE TRIGGER … ON t`
-- both abort with 42P01 when t does not yet exist — even with IF EXISTS.
-- The DO wrapper swallows that error so the script completes cleanly.
-- The triggers are installed automatically the next time schema.sql runs
-- (which creates the tables), or re-run this script after schema.sql.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Generic bulk-delete helper: removes all storage.objects rows in a bucket
-- whose name starts with the given prefix.
create or replace function public.storage_cleanup_folder(
  p_bucket text,
  p_prefix text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from storage.objects
  where  bucket_id = p_bucket
    and  name like p_prefix || '%';
end;
$$;


-- ── profiles → avatars/{user_id}/ ────────────────────────────────────────────

create or replace function public.on_profile_delete_storage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.storage_cleanup_folder('avatars', old.id::text || '/');
  return old;
end;
$$;

-- Wrapped: CREATE TRIGGER fails with 42P01 when public.profiles is absent.
do $$
begin
  drop trigger if exists trg_profile_delete_storage on public.profiles;
  create trigger trg_profile_delete_storage
    before delete on public.profiles
    for each row execute function public.on_profile_delete_storage_cleanup();
exception
  when undefined_table then
    raise notice 'public.profiles not found — skipping trg_profile_delete_storage (re-run after schema.sql)';
end;
$$;


-- ── reviews → reviews/{customer_id}/{order_id}/ ──────────────────────────────

create or replace function public.on_review_delete_storage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.storage_cleanup_folder(
    'reviews',
    old.customer_id::text || '/' || old.order_id::text || '/'
  );
  return old;
end;
$$;

do $$
begin
  drop trigger if exists trg_review_delete_storage on public.reviews;
  create trigger trg_review_delete_storage
    before delete on public.reviews
    for each row execute function public.on_review_delete_storage_cleanup();
exception
  when undefined_table then
    raise notice 'public.reviews not found — skipping trg_review_delete_storage (re-run after schema.sql)';
end;
$$;


-- ── restaurants → restaurants/{restaurant_id}/ ───────────────────────────────

create or replace function public.on_restaurant_delete_storage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.storage_cleanup_folder('restaurants', old.id::text || '/');
  return old;
end;
$$;

do $$
begin
  drop trigger if exists trg_restaurant_delete_storage on public.restaurants;
  create trigger trg_restaurant_delete_storage
    before delete on public.restaurants
    for each row execute function public.on_restaurant_delete_storage_cleanup();
exception
  when undefined_table then
    raise notice 'public.restaurants not found — skipping trg_restaurant_delete_storage (re-run after schema.sql)';
end;
$$;


-- ── banners → banners/{banner_id}/ ───────────────────────────────────────────

create or replace function public.on_banner_delete_storage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.storage_cleanup_folder('banners', old.id::text || '/');
  return old;
end;
$$;

do $$
begin
  drop trigger if exists trg_banner_delete_storage on public.banners;
  create trigger trg_banner_delete_storage
    before delete on public.banners
    for each row execute function public.on_banner_delete_storage_cleanup();
exception
  when undefined_table then
    raise notice 'public.banners not found — skipping trg_banner_delete_storage (re-run after schema.sql)';
end;
$$;
