"use client";

import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/role-gate";
import { useAuthProfile } from "@/components/use-auth-profile";
import { Card, CardBody, EmptyState } from "@/components/ui/index";
import { supabase } from "@/lib/supabase";

type HistoryRow = { id: string; delivered_at: string | null; orders?: { delivery_address: string; restaurants?: { name: string } | null } | null };

function History() {
  const { data: auth } = useAuthProfile();
  const query = useQuery({
    queryKey: ["delivery-history", auth?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_tasks").select("id,delivered_at,orders(delivery_address,restaurants(name))").eq("delivery_boy_id", auth?.user?.id ?? "").eq("status", "delivered").order("delivered_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as unknown as HistoryRow[];
    },
    enabled: Boolean(auth?.user),
  });
  return <div className="space-y-6"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">Delivery partner</p><h1 className="mt-1 text-3xl font-black text-stone-900">Delivery history</h1></div>{query.data?.length ? <Card><CardBody className="divide-y divide-stone-100 p-0">{query.data.map((task) => <div key={task.id} className="flex flex-wrap justify-between gap-3 p-5"><div><p className="font-bold text-stone-900">{task.orders?.restaurants?.name ?? "Restaurant"}</p><p className="text-sm text-stone-500">{task.orders?.delivery_address}</p></div><div className="text-right"><p className="font-bold text-emerald-600">Delivered</p><p className="text-xs text-stone-500">{task.delivered_at ? new Date(task.delivered_at).toLocaleString() : "-"}</p></div></div>)}</CardBody></Card> : <EmptyState title="No completed deliveries" body="Completed delivery tasks will appear here." />}</div>;
}

export default function DeliveryHistoryPage() { return <RoleGate allow={["delivery", "admin"]}><History /></RoleGate>; }
