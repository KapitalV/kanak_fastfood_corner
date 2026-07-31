"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, ClipboardList, IndianRupee } from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useAuthProfile } from "@/components/use-auth-profile";
import { Card, CardBody, StatCard } from "@/components/ui/index";
import { supabase } from "@/lib/supabase";

function Analytics() {
  const { data: auth } = useAuthProfile();
  const query = useQuery({ queryKey: ["store-analytics", auth?.user?.id], queryFn: async () => { const { data: restaurants } = await supabase.from("restaurants").select("id").eq("owner_id", auth?.user?.id ?? ""); const ids = (restaurants ?? []).map((item) => item.id); if (!ids.length) return { orders: 0, revenue: 0, average: 0 }; const { data: orders, error } = await supabase.from("orders").select("total_amount, order_status").in("restaurant_id", ids); if (error) throw error; const delivered = (orders ?? []).filter((order) => order.order_status === "delivered"); const revenue = delivered.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0); return { orders: delivered.length, revenue, average: delivered.length ? revenue / delivered.length : 0 }; }, enabled: Boolean(auth?.user) });
  const stats = query.data ?? { orders: 0, revenue: 0, average: 0 };
  return <div className="space-y-6"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">Store insights</p><h1 className="mt-1 text-3xl font-black text-stone-900">Analytics</h1></div><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Delivered orders" value={stats.orders} icon={<ClipboardList />} color="blue" /><StatCard label="Gross revenue" value={`₹${stats.revenue.toLocaleString("en-IN")}`} icon={<IndianRupee />} color="emerald" /><StatCard label="Average order" value={`₹${Math.round(stats.average).toLocaleString("en-IN")}`} icon={<BarChart3 />} color="orange" /></div><Card><CardBody><h2 className="font-black text-stone-900">Revenue calculation</h2><p className="mt-2 text-sm text-stone-600">Revenue is calculated from delivered orders. Final restaurant settlement is recorded in `restaurant_earnings` by the database trigger.</p></CardBody></Card></div>;
}

export default function StoreAnalyticsPage() { return <RoleGate allow={["store", "admin"]}><Analytics /></RoleGate>; }
