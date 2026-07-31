-- Phase 6 / Migration 010: enforce the order lifecycle below the API layer.
-- Rollback: drop trigger if exists orders_enforce_state_transition on public.orders;
--           drop function if exists public.enforce_order_state_transition();

create or replace function public.enforce_order_state_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_status = old.order_status then
    return new;
  end if;

  if (old.order_status = 'awaiting_payment' and new.order_status in ('placed', 'cancelled'))
    or (old.order_status = 'placed' and new.order_status in ('preparing', 'cancelled'))
    or (old.order_status = 'preparing' and new.order_status = 'ready')
    or (old.order_status = 'ready' and new.order_status = 'assigned')
    or (old.order_status = 'assigned' and new.order_status = 'picked')
    or (old.order_status = 'picked' and new.order_status = 'in_transit')
    or (old.order_status = 'in_transit' and new.order_status = 'delivered') then
    return new;
  end if;

  raise exception 'Invalid order status transition: % -> %', old.order_status, new.order_status
    using errcode = 'P0001';
end;
$$;

drop trigger if exists orders_enforce_state_transition on public.orders;
create trigger orders_enforce_state_transition
before update of order_status on public.orders
for each row execute function public.enforce_order_state_transition();
