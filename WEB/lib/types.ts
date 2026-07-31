export type Role = "customer" | "delivery" | "store" | "admin";

export type PaymentStatus = "mock" | "paid" | "failed";

export type OrderStatus =
  | "placed"
  | "preparing"
  | "ready"
  | "assigned"
  | "picked"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type DeliveryTaskStatus =
  | "assigned"
  | "accepted"
  | "picked"
  | "in_transit"
  | "delivered";

export type Profile = {
  id: string;
  name: string;
  phone: string | null;
  role: Role;
  created_at: string;
  is_available?: boolean;
};

export type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  is_open: boolean;
  delivery_radius_km: number;
  image_url: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_available: boolean;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
};

export type Order = {
  id: string;
  customer_id: string;
  restaurant_id: string;
  total_amount: number;
  delivery_fee: number;
  tax_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_boy_id: string | null;
  created_at: string;
  updated_at: string;
  restaurants?: Pick<Restaurant, "id" | "name" | "address"> | null;
  order_items?: OrderItem[];
};

export type DeliveryTask = {
  id: string;
  order_id: string;
  delivery_boy_id: string;
  status: DeliveryTaskStatus;
  assigned_at: string;
  accepted_at: string | null;
  picked_at: string | null;
  delivered_at: string | null;
  orders?: Order | null;
};

export type CartLine = {
  productId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
};
