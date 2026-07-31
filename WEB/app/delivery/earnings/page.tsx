"use client";

import { useQuery } from "@tanstack/react-query";
import { IndianRupee } from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useAuthProfile } from "@/components/use-auth-profile";
import { Card, CardBody, StatCard } from "@/components/ui/index";
import { supabase } from "@/lib/supabase";

function Earnings() { const { data: auth } = useAuthProfile(); const query = useQuery({ queryKey: ["delivery-earnings-page", auth?.user?.id], queryFn: async () => { const { data, error } = await supabase.from("orders").select("id,tip_amount,created_at").eq("delivery_boy_id", auth?.user?.id ?? "").eq("order_status", "delivered").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data as { id: string; tip_amount: number; created_at: string }[]; }, enabled: Boolean(auth?.user) }); const rows = query.data ?? []; const total = rows.reduce((sum, row) => sum + Number(row.tip_amount ?? 0), 0); return <div className="space-y-6"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">Delivery partner</p><h1 className="mt-1 text-3xl font-black text-stone-900">Earnings</h1></div><StatCard label="Tips earned" value={`₹${total.toLocaleString("en-IN")}`} icon={<IndianRupee />} color="emerald" /><Card><CardBody className="divide-y divide-stone-100 p-0">{rows.map((row) => <div key={row.id} className="flex justify-between p-4 text-sm"><span className="text-stone-500">{new Date(row.created_at).toLocaleDateString()}</span><span className="font-bold text-stone-900">₹{Number(row.tip_amount ?? 0).toLocaleString("en-IN")}</span></div>)}</CardBody></Card></div>; }
export default function DeliveryEarningsPage() { return <RoleGate allow={["delivery", "admin"]}><Earnings /></RoleGate>; }
