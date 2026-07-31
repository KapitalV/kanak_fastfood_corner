-- 1. Create one store user and one delivery user in Supabase Auth.
-- 2. Replace these UUIDs with their auth.users ids before running.

do $$
declare
  store_user_id uuid := '00000000-0000-0000-0000-000000000001';
  delivery_user_id uuid := '00000000-0000-0000-0000-000000000002';
  restaurant_id uuid;
begin
  insert into public.profiles (id, name, phone, role)
  values
    (store_user_id, 'Kanak Store Owner', '9000000001', 'store'),
    (delivery_user_id, 'Kanak Delivery Boy', '9000000002', 'delivery')
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone,
    role = excluded.role;

  insert into public.restaurants (
    owner_id,
    name,
    address,
    lat,
    lng,
    is_open,
    delivery_radius_km,
    image_url
  )
  values (
    store_user_id,
    'Kanak Kitchen',
    'Main Market Road, Kanak Local Area',
    22.5726,
    88.3639,
    true,
    6,
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'
  )
  returning id into restaurant_id;

  insert into public.products (
    restaurant_id,
    name,
    description,
    price,
    image_url,
    category,
    is_available
  )
  values
    (restaurant_id, 'Paneer Butter Masala', 'Creamy tomato gravy with soft paneer cubes.', 180, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80', 'North Indian', true),
    (restaurant_id, 'Veg Biryani', 'Aromatic rice with vegetables and house masala.', 150, 'https://images.unsplash.com/photo-1563379091339-03246963d96a?auto=format&fit=crop&w=900&q=80', 'Rice', true),
    (restaurant_id, 'Masala Dosa', 'Crisp dosa with potato masala and chutney.', 90, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80', 'South Indian', true),
    (restaurant_id, 'Gulab Jamun', 'Two warm syrup-soaked sweets.', 55, 'https://images.unsplash.com/photo-1601303516474-4a64dc568e26?auto=format&fit=crop&w=900&q=80', 'Dessert', true);
end $$;
