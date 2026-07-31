"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RoleGate } from "@/components/role-gate";
import { useAuthProfile } from "@/components/use-auth-profile";
import { Button, EmptyState, Field, inputClass, StatusBadge } from "@/components/ui";
import { formatCurrency, nextStoreStatus } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import type { Order, Product, Profile, Restaurant } from "@/lib/types";

const productSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

type ProductInput = z.input<typeof productSchema>;
type ProductValues = z.output<typeof productSchema>;

function StoreDashboard() {
  const { data: auth } = useAuthProfile();
  const queryClient = useQueryClient();

  const restaurantsQuery = useQuery({
    queryKey: ["store-restaurants", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user) return [];
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", auth.user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Restaurant[];
    },
    enabled: Boolean(auth?.user),
  });

  const restaurantIds = (restaurantsQuery.data ?? []).map((item) => item.id);
  const ordersQuery = useQuery({
    queryKey: ["store-orders", restaurantIds.join(",")],
    queryFn: async () => {
      if (restaurantIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurants(id,name,address), order_items(*)")
        .in("restaurant_id", restaurantIds)
        .neq("order_status", "delivered")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: restaurantIds.length > 0,
  });

  const productsQuery = useQuery({
    queryKey: ["store-products", restaurantIds.join(",")],
    queryFn: async () => {
      if (restaurantIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("restaurant_id", restaurantIds)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: restaurantIds.length > 0,
  });

  const deliveryUsersQuery = useQuery({
    queryKey: ["delivery-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "delivery")
        .order("name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  useEffect(() => {
    if (restaurantIds.length === 0) return;
    const channel = supabase
      .channel("store-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => queryClient.invalidateQueries({ queryKey: ["store-orders"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, restaurantIds.length]);

  const updateOrderMutation = useMutation({
      mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
        const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status }) });
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not update order");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-orders"] }),
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      orderId,
      deliveryBoyId,
    }: {
      orderId: string;
      deliveryBoyId: string;
    }) => {
        const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: "assigned", deliveryBoyId }) });
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not assign order");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-orders"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (product: Product) => {
      const { error } = await supabase
        .from("products")
        .update({ is_available: !product.is_available })
        .eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-products"] }),
  });

  const { register, handleSubmit, reset, formState } = useForm<
    ProductInput,
    unknown,
    ProductValues
  >({
    resolver: zodResolver(productSchema),
  });

  const addProductMutation = useMutation({
    mutationFn: async (values: ProductValues) => {
      const { error } = await supabase.from("products").insert({
        restaurant_id: values.restaurantId,
        name: values.name,
        description: values.description || null,
        price: values.price,
        image_url: values.imageUrl || null,
        category: values.category || null,
        is_available: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["store-products"] });
    },
  });

  const restaurants = restaurantsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const deliveryUsers = deliveryUsersQuery.data ?? [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Store dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Prepare orders, assign delivery, and manage menu availability.
        </p>
      </div>

      {restaurants.length === 0 && !restaurantsQuery.isLoading ? (
        <EmptyState
          title="No restaurant assigned"
          body="Run seed.sql with this store user id, or add a restaurant row in Supabase."
        />
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Active orders</h2>
        {orders.map((order) => {
          const next = nextStoreStatus(order.order_status);
          return (
            <article
              key={order.id}
              className="rounded-lg bg-white p-4 ring-1 ring-zinc-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{order.restaurants?.name}</p>
                  <p className="text-sm text-zinc-600">
                    {order.order_items
                      ?.map((item) => `${item.quantity} x ${item.name_snapshot}`)
                      .join(", ")}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
                <StatusBadge value={order.order_status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {next ? (
                  <Button
                    onClick={() =>
                      updateOrderMutation.mutate({
                        orderId: order.id,
                        status: next,
                      })
                    }
                  >
                    Move to {next}
                  </Button>
                ) : null}
                {order.order_status === "ready" ? (
                  <select
                    className={inputClass}
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) {
                        assignMutation.mutate({
                          orderId: order.id,
                          deliveryBoyId: event.target.value,
                        });
                      }
                    }}
                  >
                    <option value="">Assign delivery boy</option>
                    {deliveryUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </article>
          );
        })}
        {orders.length === 0 ? (
          <EmptyState title="No active orders" body="New customer orders appear here." />
        ) : null}
      </section>

      <section className="rounded-lg bg-white p-5 ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold">Add menu item</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={handleSubmit((values) => addProductMutation.mutate(values))}
        >
          <Field label="Restaurant" error={formState.errors.restaurantId?.message}>
            <select className={inputClass} {...register("restaurantId")}>
              <option value="">Choose restaurant</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" error={formState.errors.name?.message}>
            <input className={inputClass} {...register("name")} />
          </Field>
          <Field label="Price" error={formState.errors.price?.message}>
            <input className={inputClass} type="number" {...register("price")} />
          </Field>
          <Field label="Category" error={formState.errors.category?.message}>
            <input className={inputClass} {...register("category")} />
          </Field>
          <Field label="Image URL" error={formState.errors.imageUrl?.message}>
            <input className={inputClass} {...register("imageUrl")} />
          </Field>
          <Field label="Description" error={formState.errors.description?.message}>
            <input className={inputClass} {...register("description")} />
          </Field>
          <Button type="submit" className="sm:col-span-2">
            <Plus className="mr-2 size-4" /> Add item
          </Button>
        </form>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Menu items</h2>
        {products.map((product) => (
          <article
            key={product.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200"
          >
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-zinc-600">
                {formatCurrency(product.price)} · {product.category || "Menu"}
              </p>
            </div>
            <Button variant="secondary" onClick={() => toggleMutation.mutate(product)}>
              <Save className="mr-2 size-4" />
              {product.is_available ? "Mark unavailable" : "Mark available"}
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}

export default function StorePage() {
  return (
    <RoleGate allow={["store", "admin"]}>
      <StoreDashboard />
    </RoleGate>
  );
}
