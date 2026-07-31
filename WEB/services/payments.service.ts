import type { PaymentResult } from "@/types/domain";

export async function createPaymentOrder(orderId: string) {
  const response = await fetch("/api/razorpay/create-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId }) });
  if (!response.ok) throw new Error("Unable to create payment order");
  return response.json() as Promise<{ id: string; amount: number; currency: string }>;
}

export async function verifyPayment(result: PaymentResult, orderId: string) {
  const response = await fetch("/api/razorpay/verify-payment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...result, orderId }) });
  if (!response.ok) throw new Error("Payment verification failed");
  return response.json() as Promise<{ verified: boolean; alreadyProcessed?: boolean }>;
}
