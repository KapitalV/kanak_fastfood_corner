"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Power, Wallet } from "lucide-react";
import { useEffect } from "react";
import { RoleGate } from "@/components/role-gate";
import { useAuthProfile } from "@/components/use-auth-profile";
import { Button, EmptyState, StatusBadge } from "@/components/ui/index";
import { formatCurrency, nextDeliveryStatus } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import type { DeliveryTask } from "@/lib/types";

function DeliveryDashboard() {
  const { data: auth } = useAuthProfile();
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: ["delivery-tasks", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user) return [];
      const { data, error } = await supabase
        .from("delivery_tasks")
        .select("*, orders(*, restaurants(id,name,address), order_items(*))")
        .eq("delivery_boy_id", auth.user.id)
        .neq("status", "delivered")
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data as DeliveryTask[];
    },
    enabled: Boolean(auth?.user),
  });
  const earningsQuery = useQuery({
    queryKey: ["delivery-earnings", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user) return [] as { tip_amount: number; total_amount: number; created_at: string }[];
      const { data, error } = await supabase.from("orders").select("tip_amount,total_amount,created_at").eq("delivery_boy_id", auth.user.id).eq("order_status", "delivered").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as { tip_amount: number; total_amount: number; created_at: string }[];
    },
    enabled: Boolean(auth?.user),
  });

  useEffect(() => {
    if (!auth?.user) return;
    const channel = supabase
      .channel("delivery-tasks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_tasks",
          filter: `delivery_boy_id=eq.${auth.user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auth?.user, queryClient]);

  const statusMutation = useMutation({
    mutationFn: async ({
      task,
      next,
    }: {
      task: DeliveryTask;
      next: string;
    }) => {
      const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: task.order_id, status: next }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not update delivery");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["delivery-tasks"] }),
  });
  const availabilityMutation = useMutation({
    mutationFn: async (available: boolean) => {
      if (!auth?.user) return;
        const response = await fetch("/api/profile/availability", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAvailable: available }) });
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not update availability");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth-profile"] }),
  });

  const tasks = tasksQuery.data ?? [];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">Delivery dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Assigned tasks appear here after stores mark orders ready.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-4 ring-1 ring-zinc-200"><p className="text-sm text-zinc-500">Completed earnings</p><p className="mt-1 flex items-center gap-2 text-2xl font-black"><Wallet className="size-5 text-orange-600" /> ₹{(earningsQuery.data ?? []).reduce((sum, order) => sum + Number(order.tip_amount ?? 0), 0).toLocaleString("en-IN")}</p></div>
        <div className="flex items-center justify-between rounded-lg bg-white p-4 ring-1 ring-zinc-200"><div><p className="text-sm text-zinc-500">Availability</p><p className="mt-1 font-bold">{auth?.profile?.is_available === false ? "Offline" : "Online"}</p></div><Button size="sm" variant={auth?.profile?.is_available === false ? "primary" : "secondary"} onClick={() => availabilityMutation.mutate(auth?.profile?.is_available === false)}><Power className="size-4" /> {auth?.profile?.is_available === false ? "Go online" : "Go offline"}</Button></div>
      </div>
      {tasks.map((task) => {
        const order = task.orders;
        const next = nextDeliveryStatus(task.status);
        return (
          <article
            key={task.id}
            className="rounded-lg bg-white p-4 ring-1 ring-zinc-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{order?.restaurants?.name}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                  <MapPin className="size-4" /> {order?.delivery_address}
                </p>
                {order?.delivery_address ? <a className="mt-1 inline-block text-xs font-bold text-orange-600" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`} target="_blank" rel="noreferrer">Open in Maps</a> : null}
                <p className="mt-2 text-sm font-medium">
                  {formatCurrency(order?.total_amount ?? 0)}
                </p>
              </div>
              <StatusBadge value={task.status} />
            </div>
            {next ? (
              <Button
                className="mt-4"
                onClick={() => statusMutation.mutate({ task, next })}
              >
                Mark {next.replaceAll("_", " ")}
              </Button>
            ) : null}
          </article>
        );
      })}
      {tasks.length === 0 ? (
        <EmptyState title="No delivery tasks" body="Assigned deliveries will show here." />
      ) : null}
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <RoleGate allow={["delivery", "admin"]}>
      <DeliveryDashboard />
    </RoleGate>
  );
}
