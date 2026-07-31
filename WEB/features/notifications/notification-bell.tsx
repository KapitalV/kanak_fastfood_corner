"use client";

import { Bell, Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();
  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => setOpen((value) => !value)} className="relative rounded-xl p-2 text-stone-600 hover:bg-orange-50 hover:text-orange-600">
        <Bell className="size-5" />
        {unreadCount > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-orange-600 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-stone-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><p className="font-bold text-stone-900">Notifications</p><button onClick={markAllRead} className="text-xs font-semibold text-orange-600"><Check className="mr-1 inline size-3" />Mark read</button></div>
        <div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <p className="p-6 text-center text-sm text-stone-500">You’re all caught up.</p> : notifications.slice(0, 8).map((item) => <div key={item.id} className={`border-b border-stone-50 px-4 py-3 ${item.is_read ? "" : "bg-orange-50/50"}`}><p className="text-sm font-bold text-stone-900">{item.title}</p><p className="mt-1 text-xs text-stone-600">{item.body}</p></div>)}</div>
        <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-stone-100 px-4 py-3 text-center text-xs font-bold text-orange-600">View all notifications</Link>
      </div>}
    </div>
  );
}
