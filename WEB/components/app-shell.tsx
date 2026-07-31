"use client";

import {
  ChevronDown,
  Home,
  ListOrdered,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { useAuthProfile } from "./use-auth-profile";
import { Button } from "./ui";
import { supabase } from "@/lib/supabase";

const commonLinks = [
  { href: "/", label: "Restaurants", icon: Home },
  { href: "/orders", label: "Orders", icon: ListOrdered },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const { data, refetch } = useAuthProfile();
  const [open, setOpen] = useState(false);

  const roleLinks =
    data?.profile?.role === "store"
      ? [{ href: "/store", label: "Store", icon: Store }]
      : data?.profile?.role === "delivery"
        ? [{ href: "/delivery", label: "Delivery", icon: Truck }]
        : [];

  async function signOut() {
    await supabase.auth.signOut();
    await refetch();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#fff8f0] text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-black">
            <span className="grid size-10 place-items-center rounded-md bg-orange-600 text-lg text-white shadow-sm">
              K
            </span>
            <span className="hidden text-lg sm:inline">Kanak Foods</span>
          </Link>
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <div className="flex min-w-52 items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-sm">
              <MapPin className="size-4 shrink-0 text-orange-600" />
              <span className="truncate font-bold text-zinc-900">Kanak Local Area</span>
              <ChevronDown className="size-4 shrink-0 text-zinc-500" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
              <Search className="size-4 shrink-0" />
              <span className="truncate">Search for biryani, dosa, paneer, sweets...</span>
            </div>
          </div>
          <button
            aria-label="Toggle navigation"
            className="rounded-md p-2 text-zinc-700 hover:bg-orange-50 md:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <nav className="hidden items-center gap-2 md:flex">
            {[...commonLinks, ...roleLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${
                  pathname === link.href
                    ? "bg-orange-50 text-orange-700"
                    : "text-zinc-700 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                {"icon" in link && link.icon ? <link.icon className="size-4" /> : null}
                {link.label}
              </Link>
            ))}
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-orange-50 hover:text-orange-700"
            >
              <ShoppingCart className="size-4" /> Cart
              {itemCount > 0 ? (
                <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs text-white">
                  {itemCount}
                </span>
              ) : null}
            </Link>
            {data?.user ? (
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="mr-2 size-4" /> Logout
              </Button>
            ) : (
              <Link
                href="/auth"
                className="inline-flex min-h-10 items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-700"
              >
                <UserRound className="mr-2 inline size-4" /> Login
              </Link>
            )}
          </nav>
        </div>
        {open ? (
          <nav className="grid gap-2 border-t border-orange-100 bg-white px-4 py-3 md:hidden">
            <div className="flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
              <Search className="size-4" />
              <span>Search food and restaurants</span>
            </div>
            {[...commonLinks, ...roleLinks, { href: "/cart", label: "Cart" }].map(
              (link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-orange-50 hover:text-orange-700"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
