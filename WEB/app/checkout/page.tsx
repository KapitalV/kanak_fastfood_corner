"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuthProfile } from "@/hooks/use-auth";
import { useCart } from "@/features/cart/cart-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, cartTotal } from "@/utils/format";
import type { DbAddress } from "@/types/database";
import { MapPin, CreditCard, Banknote, ShieldCheck, CheckCircle2 } from "lucide-react";
import Script from "next/script";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: auth, isLoading: authLoading } = useAuthProfile();
  const { lines, tip, coupon, couponDiscount, clearCart } = useCart();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("cod");
  const [instructions, setInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCompleteId, setOrderCompleteId] = useState<string | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  // Address fetch
  const { data: addresses, isLoading: addrLoading } = useQuery({
    queryKey: ["addresses", auth?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      
      if (data && data.length > 0 && !selectedAddressId) {
        setSelectedAddressId(data[0].id);
      }
      return data as DbAddress[];
    },
    enabled: !!auth?.user?.id,
  });

  // Calculate totals
  const total = cartTotal(lines, tip, couponDiscount);

  // New Address State
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "Home", full_address: "", flat_no: "", landmark: "" });

  const saveAddressMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          user_id: auth!.user!.id,
          label: newAddr.label as any,
          full_address: newAddr.full_address,
          flat_no: newAddr.flat_no || null,
          landmark: newAddr.landmark || null,
          is_default: addresses?.length === 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DbAddress;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setSelectedAddressId(data.id);
      setShowNewAddress(false);
      success("Address saved");
    },
    onError: (err) => {
      toastError("Failed to save address", err.message);
    }
  });

  async function handlePlaceOrder() {
    if (!auth?.user) {
      toastError("Not logged in", "Please log in to place an order.");
      return;
    }
    if (lines.length === 0) {
      toastError("Empty Cart", "Add items to cart first.");
      return;
    }
    if (!selectedAddressId) {
      toastError("Address Required", "Please select or add a delivery address.");
      return;
    }

    setIsProcessing(true);

    try {
      const orderResponse = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current }, body: JSON.stringify({ addressId: selectedAddressId, paymentMethod, tip, instructions, couponCode: coupon?.code, items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, variantId: line.variantId, addonIds: line.addonIds ?? [] })) }) });
      const orderResult = await orderResponse.json() as { error?: string; order?: { id: string }; total?: number };
      if (!orderResponse.ok || !orderResult.order) throw new Error(orderResult.error ?? "Could not create order");
      const order = orderResult.order;

      // 3. Handle Payment
      if (paymentMethod === "cod") {
        completeOrder(order.id);
      } else {
        await initiateRazorpay(order.id);
      }

    } catch (err: any) {
      toastError("Failed to place order", err.message);
      setIsProcessing(false);
    }
  }

  async function initiateRazorpay(orderId: string) {
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        const fallback = await fetch("/api/orders/convert-to-cod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
        if (!fallback.ok) throw new Error(data.error ?? "Payment is not available");
        toastError("Online payment unavailable", "The order was switched to cash on delivery.");
        completeOrder(orderId);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key from env
        amount: data.amount,
        currency: data.currency,
        name: "Kanak Foods",
        description: `Order ${orderId.split("-")[0]}`,
        order_id: data.id,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderId,
            }),
          });
          
          if (verifyRes.ok) {
            completeOrder(orderId);
          } else {
            toastError("Payment Failed", "Verification failed");
            setIsProcessing(false);
          }
        },
        prefill: {
          name: auth?.profile?.name || "",
          email: auth?.user?.email || "",
          contact: auth?.profile?.phone || "",
        },
        theme: {
          color: "#ea580c",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toastError("Payment Failed", response.error.description);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err: any) {
      toastError("Payment Error", err.message);
      setIsProcessing(false);
    }
  }

  function completeOrder(orderId: string) {
    clearCart();
    setOrderCompleteId(orderId);
    setIsProcessing(false);
  }

  if (authLoading || addrLoading) {
    return <div className="p-12 text-center text-stone-500">Loading checkout...</div>;
  }

  if (orderCompleteId) {
    return (
      <div className="mx-auto max-w-md py-12 text-center animate-fade-in">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="text-3xl font-black text-stone-900 mb-2">Order Confirmed!</h1>
        <p className="text-stone-500 mb-8">
          Your order has been successfully placed. The restaurant is confirming it now.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => router.push(`/orders/${orderCompleteId}`)}>Track Order</Button>
          <Button variant="outline" onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h1 className="mb-8 text-2xl font-black text-stone-900">Secure Checkout</h1>
      
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {/* Delivery Address */}
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-stone-400" />
                  <h3 className="font-bold text-stone-900">Delivery Address</h3>
                </div>
                {!showNewAddress && (
                  <Button variant="ghost" size="sm" onClick={() => setShowNewAddress(true)}>
                    + Add New
                  </Button>
                )}
              </div>

              {showNewAddress ? (
                <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Label (e.g. Home, Work)" required>
                      <Input value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} />
                    </Field>
                    <Field label="Flat / Building Name">
                      <Input value={newAddr.flat_no} onChange={(e) => setNewAddr({ ...newAddr, flat_no: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Full Street Address" required>
                    <Textarea value={newAddr.full_address} onChange={(e) => setNewAddr({ ...newAddr, full_address: e.target.value })} />
                  </Field>
                  <Field label="Landmark (Optional)">
                    <Input value={newAddr.landmark} onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })} />
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setShowNewAddress(false)}>Cancel</Button>
                    <Button 
                      loading={saveAddressMutation.isPending} 
                      onClick={() => {
                        if (!newAddr.full_address) {
                          toastError("Validation", "Full address is required");
                          return;
                        }
                        saveAddressMutation.mutate();
                      }}
                    >
                      Save Address
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {addresses?.map((addr) => (
                    <div 
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        selectedAddressId === addr.id 
                          ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500" 
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div className="font-bold text-stone-900 mb-1">{addr.label}</div>
                      <p className="text-sm text-stone-600 line-clamp-2">
                        {addr.flat_no ? `${addr.flat_no}, ` : ""}{addr.full_address}
                      </p>
                    </div>
                  ))}
                  {addresses?.length === 0 && (
                    <p className="text-sm text-stone-500 col-span-2 py-4">No addresses saved. Please add one above.</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="size-5 text-stone-400" />
                <h3 className="font-bold text-stone-900">Payment Method</h3>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div 
                  onClick={() => setPaymentMethod("razorpay")}
                  className={`cursor-pointer rounded-xl border p-4 transition flex items-center gap-3 ${
                    paymentMethod === "razorpay" 
                      ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500" 
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <CreditCard className={`size-6 ${paymentMethod === "razorpay" ? "text-orange-600" : "text-stone-400"}`} />
                  <div>
                    <div className="font-bold text-stone-900">Pay Online</div>
                    <p className="text-xs text-stone-500">Cards, UPI, NetBanking</p>
                  </div>
                </div>

                <div 
                  onClick={() => setPaymentMethod("cod")}
                  className={`cursor-pointer rounded-xl border p-4 transition flex items-center gap-3 ${
                    paymentMethod === "cod" 
                      ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500" 
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <Banknote className={`size-6 ${paymentMethod === "cod" ? "text-orange-600" : "text-stone-400"}`} />
                  <div>
                    <div className="font-bold text-stone-900">Cash on Delivery</div>
                    <p className="text-xs text-stone-500">Pay when you receive</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-6">
              <Field label="Special Instructions (Optional)">
                <Textarea 
                  placeholder="e.g. Don't ring doorbell, leave at front door" 
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

        </div>

        {/* Total & Action */}
        <div className="space-y-6">
          <Card>
            <CardBody className="p-6 bg-stone-50">
              <h3 className="font-bold text-stone-900 mb-4 border-b border-stone-200 pb-2">Order Summary</h3>
              <div className="space-y-3 mb-4">
                {lines.map((l) => (
                  <div key={l.productId} className="flex justify-between text-sm">
                    <span className="text-stone-600 truncate mr-2">{l.quantity}x {l.name}</span>
                    <span className="font-medium text-stone-900 shrink-0">{formatCurrency(l.price * l.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-4 text-lg font-black text-stone-900">
                <span>Total</span>
                <span>{formatCurrency(total)} estimated</span>
              </div>
              
              <Button 
                className="w-full mt-6 h-14 text-lg" 
                onClick={handlePlaceOrder}
                loading={isProcessing}
                disabled={!selectedAddressId || isProcessing}
              >
                Place Order • estimated {formatCurrency(total)}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
