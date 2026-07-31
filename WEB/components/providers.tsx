"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CartProvider } from "@/features/cart/cart-provider";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <ToastProvider>{children}</ToastProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}
