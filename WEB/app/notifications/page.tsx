"use client";

import { Bell } from "lucide-react";
import { Card, CardBody, EmptyState } from "@/components/ui/index";
import { useNotifications } from "@/hooks/use-notifications";

export default function NotificationsPage() {
  const { notifications, markAllRead } = useNotifications();
  return <div className="mx-auto max-w-3xl space-y-6"><div className="flex items-center justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">Inbox</p><h1 className="mt-1 text-3xl font-black text-stone-900">Notifications</h1></div><button onClick={markAllRead} className="text-sm font-bold text-orange-600">Mark all read</button></div>{notifications.length === 0 ? <EmptyState icon={<Bell />} title="No notifications" body="Order updates and offers will show up here." /> : <Card><CardBody className="divide-y divide-stone-100 p-0">{notifications.map((item) => <article key={item.id} className={`p-5 ${item.is_read ? "" : "bg-orange-50/50"}`}><div className="flex justify-between gap-4"><h2 className="font-bold text-stone-900">{item.title}</h2><time className="text-xs text-stone-400">{new Date(item.created_at).toLocaleDateString()}</time></div><p className="mt-1 text-sm text-stone-600">{item.body}</p></article>)}</CardBody></Card>}</div>;
}
