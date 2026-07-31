"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, IndianRupee, Store, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardBody, StatCard } from "@/components/ui/index";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const query = useQuery({ queryKey: ["admin-metrics"], queryFn: async () => { const [users, restaurants, orders, revenue] = await Promise.all([supabase.from("profiles").select("id", { count: "exact", head: true }), supabase.from("restaurants").select("id", { count: "exact", head: true }), supabase.from("orders").select("id", { count: "exact", head: true }), supabase.from("orders").select("total_amount").eq("payment_status", "paid")]); return { users: users.count ?? 0, restaurants: restaurants.count ?? 0, orders: orders.count ?? 0, revenue: (revenue.data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0) }; } });
  const metrics = query.data ?? { users: 0, restaurants: 0, orders: 0, revenue: 0 };
  return <AdminShell><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Total users" value={metrics.users} icon={<Users />} color="blue" /><StatCard label="Restaurants" value={metrics.restaurants} icon={<Store />} color="orange" /><StatCard label="Orders" value={metrics.orders} icon={<ClipboardList />} color="purple" /><StatCard label="Paid revenue" value={`₹${metrics.revenue.toLocaleString("en-IN")}`} icon={<IndianRupee />} color="emerald" /></div><Card><CardBody><h2 className="text-lg font-black text-stone-900">Admin workflows</h2><p className="mt-2 text-sm text-stone-600">Approve restaurants, manage users, moderate orders, and publish offers from the sections above.</p></CardBody></Card></AdminShell>;
}
