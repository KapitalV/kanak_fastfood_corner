"use client";

import { useCart } from "@/features/cart/cart-provider";
import { cn } from "@/utils/cn";
import { Home, ListOrdered, Search, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/",        icon: Home,          label: "Home"    },
  { href: "/search",  icon: Search,        label: "Search"  },
  { href: "/cart",    icon: ShoppingCart,  label: "Cart"    },
  { href: "/orders",  icon: ListOrdered,   label: "Orders"  },
  { href: "/profile", icon: User,          label: "Profile" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white pb-safe md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                isActive ? "text-orange-600" : "text-stone-500 hover:text-stone-700",
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <tab.icon className={cn("size-5", isActive && "stroke-[2.5px]")} />
                {tab.href === "/cart" && itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </div>
              {tab.label}
              {isActive && (
                <span className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-orange-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
