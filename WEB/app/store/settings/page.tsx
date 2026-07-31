"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Clock, Store } from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useAuthProfile } from "@/components/use-auth-profile";
import { Button, Card, CardBody, Input } from "@/components/ui/index";
import { supabase } from "@/lib/supabase";
import { uploadRestaurantImage, UploadError } from "@/services/storage.service";
import { useToast } from "@/components/ui/toast";
import Image from "next/image";

type Hour = { day_of_week: number; opens_at: string; closes_at: string; is_closed: boolean };
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultHours = (): Hour[] =>
  dayNames.map((_, day_of_week) => ({ day_of_week, opens_at: "10:00", closes_at: "22:00", is_closed: false }));

function StoreSettings() {
  const { data: auth } = useAuthProfile();
  const client = useQueryClient();
  const { success, error: toastError } = useToast();
  const [hours, setHours] = useState<Hour[]>(defaultHours);
  const [imgUploading, setImgUploading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const restaurantQuery = useQuery({
    queryKey: ["store-settings", auth?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,is_open,address,image_url")
        .eq("owner_id", auth?.user?.id ?? "")
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; is_open: boolean; address: string; image_url: string | null } | null;
    },
    enabled: Boolean(auth?.user),
  });

  const hoursQuery = useQuery({
    queryKey: ["store-hours", restaurantQuery.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("day_of_week,opens_at,closes_at,is_closed")
        .eq("restaurant_id", restaurantQuery.data?.id ?? "")
        .order("day_of_week");
      if (error) throw error;
      return data as Hour[];
    },
    enabled: Boolean(restaurantQuery.data?.id),
  });

  useEffect(() => {
    if (hoursQuery.data?.length)
      setHours(
        defaultHours().map(
          (fallback) =>
            hoursQuery.data?.find((hour) => hour.day_of_week === fallback.day_of_week) ?? fallback,
        ),
      );
  }, [hoursQuery.data]);

  const toggle = useMutation({
    mutationFn: async () => {
      if (!restaurantQuery.data) return;
      const { error } = await supabase
        .from("restaurants")
        .update({ is_open: !restaurantQuery.data.is_open })
        .eq("id", restaurantQuery.data.id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["store-settings"] }),
  });

  const saveHours = useMutation({
    mutationFn: async () => {
      if (!restaurantQuery.data) return;
      const { error } = await supabase.from("business_hours").upsert(
        hours.map((hour) => ({ ...hour, restaurant_id: restaurantQuery.data!.id })),
        { onConflict: "restaurant_id,day_of_week" },
      );
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["store-hours"] }),
  });

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const restaurantId = restaurantQuery.data?.id;
    if (!file || !restaurantId) return;
    setImgUploading(true);
    try {
      const publicUrl = await uploadRestaurantImage(file, restaurantId);
      const { error } = await supabase
        .from("restaurants")
        .update({ image_url: publicUrl })
        .eq("id", restaurantId);
      if (error) throw error;
      await client.invalidateQueries({ queryKey: ["store-settings"] });
      success("Image updated", "Your restaurant cover photo has been saved.");
    } catch (err) {
      const message = err instanceof UploadError ? err.message : "Upload failed. Please try again.";
      toastError("Image not updated", message);
    } finally {
      setImgUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  }

  const restaurant = restaurantQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-orange-600">Store operations</p>
        <h1 className="mt-1 text-3xl font-black text-stone-900">Settings</h1>
      </div>

      {/* Restaurant info + image upload */}
      <Card>
        <CardBody className="space-y-5">
          {/* Cover photo */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={imgUploading || !restaurant?.id}
              onClick={() => imgInputRef.current?.click()}
              className="group relative w-full aspect-[3/1] max-h-40 rounded-xl overflow-hidden border-2 border-dashed border-orange-200 bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label="Change restaurant cover photo"
            >
              {restaurant?.image_url ? (
                <Image
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1200px"
                  className="object-cover"
                />
              ) : (
                <div className="size-full flex flex-col items-center justify-center gap-2 text-orange-400">
                  <Camera className="size-8" />
                  <span className="text-sm font-semibold">Upload cover photo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-disabled:opacity-0 transition-opacity flex items-center justify-center">
                {imgUploading ? (
                  <div className="size-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="size-8 text-white" />
                )}
              </div>
            </button>
            <p className="text-xs text-stone-500">JPG, PNG, WebP · max 5 MB · recommended 1200 × 400 px</p>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleImageChange}
            />
          </div>

          <div className="flex items-start gap-3">
            <Store className="mt-1 size-5 text-orange-600" />
            <div>
              <h2 className="font-black text-stone-900">{restaurant?.name ?? "Your restaurant"}</h2>
              <p className="text-sm text-stone-500">{restaurant?.address}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4">
            <div>
              <p className="font-bold text-stone-900">Accepting orders</p>
              <p className="text-sm text-stone-500">
                {restaurant?.is_open ? "Customers can order now." : "Your restaurant is hidden from new orders."}
              </p>
            </div>
            <Button
              variant={restaurant?.is_open ? "secondary" : "primary"}
              loading={toggle.isPending}
              onClick={() => toggle.mutate()}
            >
              {restaurant?.is_open ? "Close store" : "Open store"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Business hours */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-black text-stone-900">
              <Clock className="size-5 text-orange-600" /> Business hours
            </h2>
            <Button size="sm" loading={saveHours.isPending} onClick={() => saveHours.mutate()}>
              Save hours
            </Button>
          </div>
          <div className="mt-4 divide-y divide-stone-100">
            {hours.map((hour) => (
              <div
                key={hour.day_of_week}
                className="grid items-center gap-3 py-3 sm:grid-cols-[8rem_1fr_1fr_auto]"
              >
                <span className="font-semibold text-stone-700">{dayNames[hour.day_of_week]}</span>
                <Input
                  type="time"
                  value={hour.opens_at.slice(0, 5)}
                  disabled={hour.is_closed}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item) =>
                        item.day_of_week === hour.day_of_week
                          ? { ...item, opens_at: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <Input
                  type="time"
                  value={hour.closes_at.slice(0, 5)}
                  disabled={hour.is_closed}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item) =>
                        item.day_of_week === hour.day_of_week
                          ? { ...item, closes_at: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <input
                    type="checkbox"
                    checked={hour.is_closed}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item) =>
                          item.day_of_week === hour.day_of_week
                            ? { ...item, is_closed: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function StoreSettingsPage() {
  return (
    <RoleGate allow={["store", "admin"]}>
      <StoreSettings />
    </RoleGate>
  );
}
