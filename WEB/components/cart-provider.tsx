"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartLine, Product, Restaurant } from "@/lib/types";

type CartContextValue = {
  lines: CartLine[];
  addProduct: (product: Product, restaurant: Restaurant) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "kanak-foods-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored) as CartLine[];
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const addProduct = useCallback((product: Product, restaurant: Restaurant) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }

      if (
        current.length > 0 &&
        current.some((line) => line.restaurantId !== product.restaurant_id)
      ) {
        return [
          {
            productId: product.id,
            restaurantId: product.restaurant_id,
            restaurantName: restaurant.name,
            name: product.name,
            price: product.price,
            imageUrl: product.image_url,
            quantity: 1,
          },
        ];
      }

      return [
        ...current,
        {
          productId: product.id,
          restaurantId: product.restaurant_id,
          restaurantName: restaurant.name,
          name: product.name,
          price: product.price,
          imageUrl: product.image_url,
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(0, quantity) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      addProduct,
      updateQuantity,
      removeLine,
      clearCart,
      itemCount: lines.reduce((count, line) => count + line.quantity, 0),
    }),
    [addProduct, clearCart, lines, removeLine, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within CartProvider");
  }

  return value;
}
