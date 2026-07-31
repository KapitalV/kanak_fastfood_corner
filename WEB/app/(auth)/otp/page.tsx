"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";

export default function OtpPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setLoading(true);
    const normalized = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);
    if (error) return toastError("Could not send OTP", error.message);
    setSent(true);
    success("OTP sent", "Check your phone for the verification code.");
  }

  async function verifyOtp() {
    setLoading(true);
    const normalized = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.verifyOtp({ phone: normalized, token, type: "sms" });
    setLoading(false);
    if (error) return toastError("Invalid OTP", error.message);
    router.push("/");
    router.refresh();
  }

  return <Card className="mx-auto max-w-md"><CardBody className="p-8"><div className="mb-6 text-center"><div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-orange-500 text-white"><ShieldCheck className="size-6" /></div><h1 className="text-2xl font-black text-stone-900">Sign in with OTP</h1><p className="mt-1 text-sm text-stone-500">Your Supabase phone provider must be enabled.</p></div><div className="space-y-4"><label className="block text-sm font-semibold text-stone-700">Mobile number<Input className="mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="9876543210 or +919876543210" /></label>{sent && <label className="block text-sm font-semibold text-stone-700">Verification code<Input className="mt-1" value={token} onChange={(event) => setToken(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" /></label>}{sent ? <Button className="w-full" loading={loading} onClick={verifyOtp}><Phone className="size-4" /> Verify OTP</Button> : <Button className="w-full" loading={loading} onClick={sendOtp} disabled={phone.replace(/\D/g, "").length < 10}>Send OTP</Button>}</div><p className="mt-6 text-center text-sm text-stone-500"><Link href="/login" className="font-bold text-orange-600">Use email and password</Link></p></CardBody></Card>;
}
