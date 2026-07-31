-- Phase 2 / Migration 007: atomic order creation, coupon reservation, and idempotency.
-- Rollback: drop the RPC, then the idempotency index/column and enum value only after
-- dependent application code and data have been reviewed.

alter type public.order_status add value if not exists 'awaiting_payment';

alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_customer_idempotency_key_idx
  on public.orders(customer_id, idempotency_key)
  where idempotency_key is not null;

-- Order lifecycle: awaiting_payment -> placed -> preparing -> ready -> assigned
-- -> picked -> in_transit -> delivered. Any active order may be cancelled by the
-- authorized customer/store/admin according to the existing authorization rules.
-- Payment handlers move awaiting_payment to placed after payment is settled (or when
-- a COD order is confirmed).
create or replace function public.create_order_with_items(
  p_customer_id uuid,
  p_idempotency_key text,
  p_restaurant_id uuid,
  p_total_amount numeric,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_tax_amount numeric,
  p_packaging_charge numeric,
  p_platform_fee numeric,
  p_tip_amount numeric,
  p_coupon_id uuid,
  p_coupon_discount numeric,
  p_payment_method text,
  p_payment_status public.payment_status,
  p_order_status public.order_status,
  p_delivery_address text,
  p_delivery_lat numeric,
  p_delivery_lng numeric,
  p_delivery_instructions text,
  p_special_instructions text,
  p_items jsonb
)
returns setof public.orders
language plpgsql
set search_path = public
as $$
declare
  v_order_id uuid;
  v_coupon_id uuid;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Idempotency-Key is required';
  end if;

  -- The unique key also serializes concurrent requests for the same customer/key.
  -- A retry returns before touching coupon usage or inserting items.
  select id into v_order_id
  from public.orders
  where customer_id = p_customer_id and idempotency_key = p_idempotency_key;
  if v_order_id is not null then
    return query select * from public.orders where id = v_order_id;
    return;
  end if;

  insert into public.orders (
    customer_id, restaurant_id, total_amount, subtotal, delivery_fee, tax_amount,
    packaging_charge, platform_fee, tip_amount, coupon_id, coupon_discount,
    payment_method, payment_status, order_status, delivery_address, delivery_lat,
    delivery_lng, delivery_instructions, special_instructions, idempotency_key
  ) values (
    p_customer_id, p_restaurant_id, p_total_amount, p_subtotal, p_delivery_fee,
    p_tax_amount, p_packaging_charge, p_platform_fee, p_tip_amount, p_coupon_id,
    p_coupon_discount, p_payment_method, p_payment_status, p_order_status,
    p_delivery_address, p_delivery_lat, p_delivery_lng, p_delivery_instructions,
    p_special_instructions, p_idempotency_key
  )
  on conflict (customer_id, idempotency_key) where idempotency_key is not null do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select id into v_order_id
    from public.orders
    where customer_id = p_customer_id and idempotency_key = p_idempotency_key;
    return query select * from public.orders where id = v_order_id;
    return;
  end if;

  if p_coupon_id is not null then
    update public.coupons
    set used_count = used_count + 1
    where id = p_coupon_id
      and (max_uses is null or used_count < max_uses)
    returning id into v_coupon_id;
    if v_coupon_id is null then
      raise exception 'Coupon usage limit has been reached';
    end if;
  end if;

  insert into public.order_items (
    order_id, product_id, name_snapshot, price_snapshot, image_snapshot, quantity
  )
  select v_order_id, item.product_id, item.name_snapshot, item.price_snapshot,
    item.image_snapshot, item.quantity
  from jsonb_to_recordset(p_items) as item(
    product_id uuid,
    name_snapshot text,
    price_snapshot numeric,
    image_snapshot text,
    quantity integer
  );

  return query select * from public.orders where id = v_order_id;
end;
$$;

revoke all on function public.create_order_with_items(
  uuid, text, uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  uuid, numeric, text, public.payment_status, public.order_status, text, numeric,
  numeric, text, text, jsonb
) from public, anon, authenticated;

-- ROLLBACK
-- drop function public.create_order_with_items(...);
-- drop index public.orders_customer_idempotency_key_idx;
-- alter table public.orders drop column idempotency_key;
