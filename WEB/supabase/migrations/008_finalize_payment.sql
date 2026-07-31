-- Phase 3 / Migration 008: transactional payment finalization.
-- Rollback: drop function public.finalize_payment(...);

-- Atomically: lock the order row, verify amount, update status, insert
-- payment_events (idempotency via unique provider_event_id), and create a
-- customer notification — all in a single transaction.

create or replace function public.finalize_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint,
  p_provider_event_id text,
  p_event_type text,
  p_event_payload jsonb default '{}'::jsonb,
  p_notification_user_id uuid default null,
  p_notification_title text default 'Payment Confirmed',
  p_notification_body text default 'Your payment has been confirmed and your order is now being processed.'
)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  -- Lock the order row to serialize concurrent finalization attempts.
  select * into v_order
  from public.orders
  where id = p_order_id
    and razorpay_order_id = p_razorpay_order_id
  for update;

  if v_order is null then
    raise exception 'Order not found or Razorpay order ID mismatch';
  end if;

  -- Already finalized — return the order without error (idempotent).
  if v_order.payment_status = 'paid' then
    return query select * from public.orders where id = p_order_id;
    return;
  end if;

  -- Only orders awaiting payment may be finalized.
  if v_order.order_status <> 'awaiting_payment' then
    raise exception 'Order is not in awaiting_payment state (current: %)', v_order.order_status;
  end if;

  -- Server-side amount verification: the stored total must match the charged
  -- amount exactly. This closes amount-tampering attacks.
  if (v_order.total_amount * 100)::bigint <> p_amount_paise then
    raise exception 'Amount mismatch: stored=% paise, received=% paise',
      (v_order.total_amount * 100)::bigint, p_amount_paise;
  end if;

  -- Finalize the order.
  update public.orders
  set payment_status = 'paid',
      order_status = 'placed',
      razorpay_payment_id = p_razorpay_payment_id
  where id = p_order_id;

  -- Idempotency guard: the unique constraint on provider_event_id will
  -- raise error 23505 on duplicate, which the caller catches and treats
  -- as success.
  insert into public.payment_events (order_id, provider_event_id, type, payload)
  values (p_order_id, p_provider_event_id, p_event_type, p_event_payload);

  -- Notify the customer.
  if p_notification_user_id is not null then
    insert into public.notifications (user_id, title, body, type, data)
    values (
      p_notification_user_id,
      p_notification_title,
      p_notification_body,
      'order',
      jsonb_build_object('order_id', p_order_id)
    );
  end if;

  return query select * from public.orders where id = p_order_id;
end;
$$;

-- Only the service-role (admin) client should call this function.
revoke all on function public.finalize_payment(
  uuid, text, text, bigint, text, text, jsonb, uuid, text, text
) from public, anon, authenticated;

-- ROLLBACK
-- drop function public.finalize_payment(uuid, text, text, bigint, text, text, jsonb, uuid, text, text);
