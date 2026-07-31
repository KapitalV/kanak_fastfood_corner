"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { uploadReviewImages, UploadError } from "@/services/storage.service";

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <fieldset><legend className="mb-2 text-sm font-bold text-stone-700">{label}</legend><div className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} aria-label={`${star} stars`} onClick={() => onChange(star)}><Star className={`size-7 ${star <= value ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} /></button>)}</div></fieldset>;
}

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [food, setFood] = useState(0);
  const [restaurant, setRestaurant] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const orderQuery = useQuery({ queryKey: ["review-order", params.id], queryFn: async () => { const { data, error } = await supabase.from("orders").select("id, customer_id, restaurant_id, order_status").eq("id", params.id).single(); if (error) throw error; return data as { id: string; customer_id: string; restaurant_id: string; order_status: string }; } });

  async function submit() {
    if (!orderQuery.data || food === 0 || restaurant === 0)
      return toastError("Rating required", "Rate the food and restaurant before submitting.");
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return toastError("Login required", "Please sign in again.");
    }
    // Upload images via the server-side endpoint (magic-byte sniffed)
    let images: string[] = [];
    const selectedFiles = files.slice(0, 3);
    if (selectedFiles.length > 0) {
      try {
        images = await uploadReviewImages(selectedFiles, params.id);
      } catch (err) {
        setSaving(false);
        const message = err instanceof UploadError ? err.message : "Image upload failed. Please try again.";
        return toastError("Images not uploaded", message);
      }
    }
    const { error } = await supabase.from("reviews").insert({
      order_id: params.id,
      customer_id: userData.user.id,
      restaurant_id: orderQuery.data.restaurant_id,
      food_rating: food,
      restaurant_rating: restaurant,
      delivery_rating: delivery || null,
      comment: comment.trim() || null,
      images,
    });
    setSaving(false);
    if (error) return toastError("Review not saved", error.message);
    success("Thank you", "Your review has been published.");
    router.push(`/orders/${params.id}`);
  }

  return <Card className="mx-auto max-w-2xl"><CardBody className="space-y-6 p-6 sm:p-8"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">Order feedback</p><h1 className="mt-1 text-3xl font-black text-stone-900">How was your meal?</h1><p className="mt-2 text-sm text-stone-500">Your feedback helps restaurants and delivery partners improve.</p></div><div className="grid gap-5 sm:grid-cols-3"><Rating label="Food" value={food} onChange={setFood} /><Rating label="Restaurant" value={restaurant} onChange={setRestaurant} /><Rating label="Delivery" value={delivery} onChange={setDelivery} /></div><label className="block text-sm font-bold text-stone-700">Comment<Textarea className="mt-2" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Tell us what you liked…" maxLength={1000} /></label><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-600"><Upload className="size-5 text-orange-600" /> Add up to 3 photos<input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))} /></label>{files.length > 0 && <p className="text-xs text-stone-500">{files.map((file) => file.name).join(", ")}</p>}<Button className="w-full" loading={saving} onClick={submit}>Publish review</Button></CardBody></Card>;
}
