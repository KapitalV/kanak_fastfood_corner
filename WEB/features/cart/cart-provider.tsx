"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartLine, CartState } from "@/types/domain";
import type { DbProduct, DbRestaurant } from "@/types/database";
import { CART_STORAGE_KEY } from "@/constants";

interface CartContextValue extends CartState {
  addProduct: (product: DbProduct, restaurant: DbRestaurant) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  replaceCart: (lines: CartLine[]) => void;
  setTip: (tip: number) => void;
  setCoupon: (coupon: CartState["coupon"], discount: number) => void;
  removeCoupon: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadPersistedCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CartLine[]) : [];
  } catch {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadPersistedCart);
  const [tip, setTipState] = useState(0);
  const [coupon, setCouponState] = useState<CartState["coupon"]>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Persist cart to localStorage
  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const addProduct = useCallback(
    (product: DbProduct, restaurant: DbRestaurant) => {
      setLines((current) => {
        const existing = current.find((l) => l.productId === product.id);
        if (existing) {
          return current.map((l) =>
            l.productId === product.id
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          );
        }

        // Different restaurant — clear cart and start fresh
        const fromDifferentRestaurant =
          current.length > 0 &&
          current.some((l) => l.restaurantId !== product.restaurant_id);

        const newLine: CartLine = {
          productId: product.id,
          restaurantId: product.restaurant_id,
          restaurantName: restaurant.name,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.image_url,
          isVeg: product.is_veg,
          quantity: 1,
        };

        return fromDifferentRestaurant ? [newLine] : [...current, newLine];
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setLines((current) =>
        current
          .map((l) =>
            l.productId === productId
              ? { ...l, quantity: Math.max(0, quantity) }
              : l,
          )
          .filter((l) => l.quantity > 0),
      );
    },
    [],
  );

  const removeLine = useCallback((productId: string) => {
    setLines((current) => current.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setTipState(0);
    setCouponState(null);
    setCouponDiscount(0);
  }, []);

  const replaceCart = useCallback((nextLines: CartLine[]) => {
    setLines(nextLines);
    setTipState(0);
    setCouponState(null);
    setCouponDiscount(0);
  }, []);

  const setTip = useCallback((amount: number) => {
    setTipState(amount);
  }, []);

  const setCoupon = useCallback(
    (c: CartState["coupon"], discount: number) => {
      setCouponState(c);
      setCouponDiscount(discount);
    },
    [],
  );

  const removeCoupon = useCallback(() => {
    setCouponState(null);
    setCouponDiscount(0);
  }, []);

  const value = useMemo(
    () => ({
      lines,
      tip,
      coupon,
      couponDiscount,
      addProduct,
      updateQuantity,
      removeLine,
      clearCart,
      replaceCart,
      setTip,
      setCoupon,
      removeCoupon,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.price * l.quantity, 0),
    }),
    [
      lines,
      tip,
      coupon,
      couponDiscount,
      addProduct,
      updateQuantity,
      removeLine,
      clearCart,
      replaceCart,
      setTip,
      setCoupon,
      removeCoupon,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
