"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/features/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import type { CartLine } from "@/types/domain";
import { EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { useAuthProfile } from "@/components/use-auth-profile";
import { formatCurrency } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const { data: auth } = useAuthProfile();
  const queryClient = useQueryClient();
  const { replaceCart } = useCart();

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurants(id,name,address), order_items(*)")
        .eq("customer_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: Boolean(auth?.user),
  });

  useEffect(() => {
    if (!auth?.user) return;
    const channel = supabase
      .channel("customer-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${auth.user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["customer-orders"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auth?.user, queryClient]);

  if (!auth?.user) {
    return (
      <EmptyState
        title="Login to view orders"
        body="Your order history appears here after checkout."
        action={<LinkButton href="/auth">Login</LinkButton>}
      />
    );
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Order history</h1>
      {orders.length === 0 && !ordersQuery.isLoading ? (
        <EmptyState
          title="No orders yet"
          body="Place your first order from a restaurant menu."
          action={<LinkButton href="/">Browse restaurants</LinkButton>}
        />
      ) : null}
      {orders.map((order) => (
        <article
          key={order.id}
          className="rounded-lg bg-white p-4 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{order.restaurants?.name}</p>
              <p className="text-sm text-zinc-600">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge value={order.order_status} />
              <span className="font-semibold">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/orders/${order.id}`} className="text-sm font-bold text-orange-600">View order</Link>
            {order.order_items?.length ? <Button size="sm" variant="secondary" onClick={() => replaceCart(order.order_items!.map((item) => ({ productId: item.product_id, restaurantId: order.restaurant_id, restaurantName: order.restaurants?.name ?? "Restaurant", name: item.name_snapshot, description: null, price: item.price_snapshot, imageUrl: null, isVeg: false, quantity: item.quantity } as CartLine)))}><ShoppingBag className="size-4" /> Reorder</Button> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
