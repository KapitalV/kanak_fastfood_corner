"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCart } from "@/features/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { VegBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, cartTotal, cartTax, cartDeliveryFee, cartPackagingCharge, cartSubtotal, cartPlatformFee } from "@/utils/format";
import { TIP_OPTIONS } from "@/constants";
import { supabase } from "@/lib/supabase";
import type { DbCoupon } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Tag, Bike, Receipt, ArrowRight, Store } from "lucide-react";
import { useState } from "react";

export default function CartPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { 
    lines, 
    tip, 
    setTip, 
    coupon, 
    setCoupon, 
    couponDiscount, 
    removeCoupon,
    updateQuantity, 
    removeLine 
  } = useCart();
  
  const [couponCode, setCouponCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const subtotal = cartSubtotal(lines);
  const tax = cartTax(lines);
  const delivery = cartDeliveryFee(subtotal);
  const packaging = cartPackagingCharge();
  const platform = cartPlatformFee();
  const total = cartTotal(lines, tip, couponDiscount);
  const restaurantName = lines[0]?.restaurantName;
  const restaurantId = lines[0]?.restaurantId;

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsApplying(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toastError("Invalid Coupon", "This coupon code does not exist or is inactive.");
        return;
      }

      const c = data as DbCoupon;

      // Validate restaurant specific coupon
      if (c.restaurant_id && c.restaurant_id !== restaurantId) {
        toastError("Invalid Coupon", "This coupon is not valid for this restaurant.");
        return;
      }

      // Validate min amount
      if (subtotal < c.min_order_amount) {
        toastError("Minimum Amount", `This coupon requires a minimum order of ${formatCurrency(c.min_order_amount)}`);
        return;
      }

      // Calculate discount
      let discount = 0;
      if (c.discount_type === "flat") {
        discount = c.discount_value;
      } else {
        discount = (subtotal * c.discount_value) / 100;
        if (c.max_discount && discount > c.max_discount) {
          discount = c.max_discount;
        }
      }

      setCoupon(c, discount);
      success("Coupon Applied!", `You saved ${formatCurrency(discount)}`);
      setCouponCode("");
    } catch (err: any) {
      toastError("Error", err.message);
    } finally {
      setIsApplying(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<ShoppingCart />}
          title="Your cart is empty"
          body="Looks like you haven't added anything to your cart yet."
          action={
            <Button onClick={() => router.push("/")} size="lg">
              Browse Restaurants
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <h1 className="mb-8 text-2xl font-black text-stone-900">Checkout Cart</h1>
      
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {/* Items */}
          <Card>
            <CardBody className="p-0">
              <div className="border-b border-stone-100 p-5">
                <Link 
                  href={`/restaurants/${restaurantId}`}
                  className="flex items-center gap-3 hover:opacity-80 transition"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Store className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Ordering From</p>
                    <h2 className="font-bold text-stone-900">{restaurantName}</h2>
                  </div>
                </Link>
              </div>
              
              <div className="divide-y divide-stone-100">
                {lines.map((line) => (
                  <div key={line.productId} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1"><VegBadge isVeg={line.isVeg} /></div>
                      <div>
                        <h3 className="font-bold text-stone-900">{line.name}</h3>
                        <p className="mt-1 font-semibold text-stone-600">{formatCurrency(line.price)}</p>
                      </div>
                    </div>
                    
                    <div className="flex h-10 items-center justify-between sm:justify-end rounded-xl bg-orange-50 ring-1 ring-orange-200">
                      <button
                        onClick={() => line.quantity === 1 ? removeLine(line.productId) : updateQuantity(line.productId, line.quantity - 1)}
                        className="flex w-10 items-center justify-center text-orange-600 hover:bg-orange-100 rounded-l-xl transition h-full"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-10 text-center font-bold text-orange-700">{line.quantity}</span>
                      <button
                        onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                        className="flex w-10 items-center justify-center text-orange-600 hover:bg-orange-100 rounded-r-xl transition h-full"
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Tips */}
          <Card>
            <CardBody className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bike className="size-5 text-stone-400" />
                <h3 className="font-bold text-stone-900">Say thanks with a tip</h3>
              </div>
              <p className="text-sm text-stone-500 mb-4">
                100% of your tip goes to your delivery partner.
              </p>
              <div className="flex flex-wrap gap-3">
                {TIP_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTip(tip === amount ? 0 : amount)}
                    className={`rounded-xl border px-4 py-2 font-bold transition ${
                      tip === amount
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Bill Details */}
        <div className="space-y-6">
          <Card>
            <CardBody className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="size-5 text-stone-400" />
                <h3 className="font-bold text-stone-900">Offers & Benefits</h3>
              </div>
              
              {coupon ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
                  <div className="flex items-center gap-2">
                    <div className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      {coupon.code}
                    </div>
                    <span className="text-sm font-semibold text-emerald-800">
                      Applied
                    </span>
                  </div>
                  <button 
                    onClick={removeCoupon}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <Input 
                    placeholder="Enter coupon code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="uppercase"
                  />
                  <Button type="submit" variant="secondary" loading={isApplying}>
                    Apply
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-2 mb-4 border-b border-stone-100 pb-4">
                <Receipt className="size-5 text-stone-400" />
                <h3 className="font-bold text-stone-900">Bill Details</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Item Total</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-stone-900">{delivery === 0 ? "FREE" : formatCurrency(delivery)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Taxes</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Packaging Charge</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(packaging)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(platform)}</span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery Tip</span>
                    <span className="font-semibold text-stone-900">{formatCurrency(tip)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({coupon?.code})</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 text-lg font-black text-stone-900">
                <span>Estimated total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </CardBody>
          </Card>

          <Button 
            className="w-full text-lg h-14" 
            onClick={() => router.push("/checkout")}
          >
            Proceed to Checkout
            <ArrowRight className="ml-2 size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
