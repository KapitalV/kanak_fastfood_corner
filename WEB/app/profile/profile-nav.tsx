"use client";

import { User, MapPin, ListOrdered } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

const navItems = [
  { label: "Profile Info", href: "/profile", icon: User },
  { label: "Addresses", href: "/profile/addresses", icon: MapPin },
  { label: "My Orders", href: "/orders", icon: ListOrdered },
];

export function ProfileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row overflow-x-auto rounded-2xl bg-white p-2 shadow-[var(--shadow-sm)] ring-1 ring-stone-100 scroll-x md:flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/profile" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
              isActive
                ? "bg-orange-50 text-orange-700"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
            )}
          >
            <item.icon
              className={cn("size-5", isActive ? "text-orange-500" : "text-stone-400")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
