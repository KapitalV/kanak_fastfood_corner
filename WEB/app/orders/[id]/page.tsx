"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { useEffect } from "react";
import { EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { formatCurrency } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const orderQuery = useQuery({
    queryKey: ["order", params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurants(id,name,address), order_items(*)")
        .eq("id", params.id)
        .single();
      if (error) throw error;
      return data as Order;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`order-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${params.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["order", params.id] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_tasks",
          filter: `order_id=eq.${params.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["order", params.id] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, queryClient]);

  if (orderQuery.isLoading) {
    return <p className="text-sm text-zinc-600">Loading order...</p>;
  }

  if (!orderQuery.data) {
    return (
      <EmptyState
        title="Order not found"
        body="This order could not be loaded."
        action={<LinkButton href="/orders">Back to orders</LinkButton>}
      />
    );
  }

  const order = orderQuery.data;

  function downloadInvoice() {
    const lines = (order.order_items ?? []).map((item) => `${item.quantity} x ${item.name_snapshot}  ${formatCurrency(item.price_snapshot * item.quantity)}`).join("\n");
    const invoice = [`KANAK FOODS INVOICE`, `Order: ${order.id}`, `Date: ${new Date(order.created_at).toLocaleString()}`, `Restaurant: ${order.restaurants?.name ?? ""}`, `Address: ${order.delivery_address}`, "", lines, "", `Total: ${formatCurrency(order.total_amount)}`].join("\n");
    const url = URL.createObjectURL(new Blob([invoice], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `kanak-invoice-${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg bg-white p-5 ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Order confirmation
            </p>
            <h1 className="mt-1 text-2xl font-bold">{order.restaurants?.name}</h1>
            <p className="mt-2 text-sm text-zinc-600">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <StatusBadge value={order.order_status} />
        </div>
        <div className="mt-6 grid gap-3">
          {order.order_items?.map((item) => (
            <div
              key={item.id}
              className="flex justify-between border-b border-zinc-100 pb-3 text-sm"
            >
              <span>
                {item.quantity} x {item.name_snapshot}
              </span>
              <span>{formatCurrency(item.price_snapshot * item.quantity)}</span>
            </div>
          ))}
        </div>
      </section>
      <aside className="h-fit rounded-lg bg-white p-5 ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold">Live status</h2>
        <ol className="mt-4 grid gap-3 text-sm">
          {["placed", "preparing", "ready", "assigned", "picked", "in_transit", "delivered"].map(
            (status) => (
              <li
                key={status}
                className={`rounded-md px-3 py-2 capitalize ${
                  order.order_status === status
                    ? "bg-emerald-700 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {status.replaceAll("_", " ")}
              </li>
            ),
          )}
        </ol>
        <div className="mt-5 border-t border-zinc-200 pt-4">
          <p className="text-sm text-zinc-600">Delivery address</p>
          <p className="mt-1 font-medium">{order.delivery_address}</p>
          <p className="mt-4 text-xl font-bold">
            {formatCurrency(order.total_amount)}
          </p>
          {order.order_status === "delivered" ? (
            <Link href={`/orders/${order.id}/review`} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700">Rate this order</Link>
          ) : null}
          <button onClick={downloadInvoice} className="mt-3 flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-orange-600"><Download className="size-4" /> Download invoice</button>
        </div>
      </aside>
    </div>
  );
}
