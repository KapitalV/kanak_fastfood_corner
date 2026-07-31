"use client";

import { supabase } from "@/lib/supabase";
import { useAuthProfile } from "@/hooks/use-auth";
import { useCart } from "@/features/cart/cart-provider";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";
import {
  ChevronDown,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  Store,
  Truck,
  User,
  X,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/features/notifications/notification-bell";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useAuthProfile();
  const { itemCount } = useCart();
  const { success } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = data?.profile?.role;
  const user = data?.user;

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    success("Signed out", "See you next time!");
    router.push("/");
    setMobileOpen(false);
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Explore" },
    { href: "/orders", label: "Orders" },
    ...(role === "store"
      ? [{ href: "/store", label: "My Store", icon: Store }]
      : []),
    ...(role === "delivery"
      ? [{ href: "/delivery", label: "Delivery", icon: Truck }]
      : []),
    ...(role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Main bar */}
      <div className="glass border-b border-white/40 shadow-[var(--shadow-sm)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 font-black"
          >
            <span className="gradient-brand flex size-9 items-center justify-center rounded-xl text-sm font-black text-white shadow-[var(--shadow-brand)]">
              K
            </span>
            <span className="hidden text-base font-black text-stone-900 sm:block">
              Kanak Foods
            </span>
          </Link>

          {/* Location pill (desktop) */}
          <button className="hidden min-w-0 max-w-48 items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm transition hover:bg-orange-100 lg:flex">
            <MapPin className="size-4 shrink-0 text-orange-500" />
            <span className="truncate font-semibold text-stone-800">
              Kanak Area
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-stone-500" />
          </button>

          {/* Search bar (desktop) */}
          <Link
            href="/search"
            className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-stone-100 px-3.5 py-2.5 text-sm text-stone-500 transition hover:bg-stone-200 lg:flex"
          >
            <Search className="size-4 shrink-0" />
            <span>Search dishes, restaurants…</span>
          </Link>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Cart */}
            <Link
              href="/cart"
              className="relative rounded-xl p-2.5 text-stone-700 transition hover:bg-orange-50 hover:text-orange-600"
              aria-label={`Cart — ${itemCount} items`}
            >
              <ShoppingCart className="size-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>

            {/* Notifications (logged in) */}
            {user && (
              <NotificationBell />
            )}

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    pathname === link.href
                      ? "bg-orange-100 text-orange-700"
                      : "text-stone-600 hover:bg-orange-50 hover:text-orange-700",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {user ? (
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                >
                  <User className="size-4" />
                  <span className="hidden lg:block">
                    {data?.profile?.name?.split(" ")[0] ?? "Profile"}
                  </span>
                </Link>
                <button
                  onClick={signOut}
                  className="rounded-xl p-2.5 text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="gradient-brand hidden rounded-xl px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-brand)] hover:opacity-90 transition md:flex"
              >
                Login
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-xl p-2.5 text-stone-700 transition hover:bg-orange-50 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="border-t border-stone-100 px-4 pb-3 md:hidden">
          <Link
            href="/search"
            className="flex items-center gap-2.5 rounded-xl bg-stone-100 px-3.5 py-2.5 text-sm text-stone-500"
          >
            <Search className="size-4 shrink-0" />
            <span>Search dishes, restaurants…</span>
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="border-b border-stone-200 bg-white px-4 py-3 shadow-[var(--shadow-md)] md:hidden animate-fade-in">
          <div className="grid gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  pathname === link.href
                    ? "bg-orange-100 text-orange-700"
                    : "text-stone-700 hover:bg-orange-50",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-stone-100" />
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-orange-50"
                >
                  My Profile
                </Link>
                <button
                  onClick={signOut}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="gradient-brand rounded-xl px-4 py-2.5 text-center text-sm font-bold text-white"
              >
                Login / Register
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
