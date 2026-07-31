-- Phase 1 / Migration 006: compound query indexes.
-- Rollback: drop the indexes listed below if they are not needed by later workloads.

create index if not exists restaurants_approval_rating_idx on public.restaurants(is_approved, avg_rating);
create index if not exists products_restaurant_available_sort_idx on public.products(restaurant_id, is_available, sort_order);
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at);
create index if not exists orders_restaurant_status_idx on public.orders(restaurant_id, order_status);
create index if not exists orders_delivery_status_idx on public.orders(delivery_boy_id, order_status);
create index if not exists notifications_user_read_created_idx on public.notifications(user_id, is_read, created_at);
create index if not exists restaurant_earnings_restaurant_created_idx on public.restaurant_earnings(restaurant_id, created_at desc);

-- ROLLBACK
-- Drop the Phase 1 compound indexes by name if query-plan review shows they are not required.
