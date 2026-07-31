"use client";

import Link from "next/link";
import { ClipboardList, Image, LayoutDashboard, Percent, Store, Users } from "lucide-react";
import { RoleGate } from "@/components/role-gate";

const links = [["/admin", "Overview", LayoutDashboard], ["/admin/users", "Users", Users], ["/admin/restaurants", "Restaurants", Store], ["/admin/orders", "Orders", ClipboardList], ["/admin/coupons", "Coupons", Percent], ["/admin/banners", "Banners", Image]] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["admin"]}><div className="space-y-6"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">Operations</p><h1 className="mt-1 text-3xl font-black text-stone-900">Admin console</h1></div><nav className="flex gap-2 overflow-x-auto pb-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-stone-600 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700"><Icon className="size-4" />{label}</Link>)}</nav>{children}</div></RoleGate>;
}
