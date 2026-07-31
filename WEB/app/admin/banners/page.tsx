"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Card, CardBody, Input } from "@/components/ui/index";
import { supabase } from "@/lib/supabase";
import { uploadBannerImage, UploadError } from "@/services/storage.service";
import { useToast } from "@/components/ui/toast";
import Image from "next/image";

type Banner = { id: string; title: string; image_url: string; is_active: boolean };

export default function AdminBannersPage() {
  const client = useQueryClient();
  const { success, error: toastError } = useToast();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const query = useQuery({
    queryKey: ["admin-banners-edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Banner[];
    },
  });

  async function createBanner() {
    if (!title.trim() || !file) {
      toastError("Missing fields", "Enter a title and choose an image.");
      return;
    }
    setCreating(true);
    try {
      // Insert a placeholder row first to get the ID, then upload and update
      const { data: row, error: insertErr } = await supabase
        .from("banners")
        .insert({ title: title.trim(), image_url: "", is_active: true })
        .select("id")
        .single();
      if (insertErr || !row) throw insertErr ?? new Error("Insert failed");

      // Upload image via server-side API (magic-byte validated)
      const publicUrl = await uploadBannerImage(file, row.id);

      // Update the row with the real URL
      await supabase.from("banners").update({ image_url: publicUrl }).eq("id", row.id);

      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      client.invalidateQueries({ queryKey: ["admin-banners-edit"] });
      success("Banner published", "The new banner is now live.");
    } catch (err) {
      const message = err instanceof UploadError ? err.message : "Failed to create banner.";
      toastError("Banner not created", message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminShell>
      <Card>
        <CardBody>
          <h2 className="font-black text-stone-900">Publish banner</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              placeholder="Weekend offer"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {/* File picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <ImagePlus className="size-4 text-orange-600" />
              {file ? file.name.slice(0, 20) : "Choose image"}
            </button>
            <Button loading={creating} onClick={createBanner}>
              Publish
            </Button>
          </div>
          <p className="mt-2 text-xs text-stone-400">JPG, PNG, WebP · max 5 MB · recommended 1440 × 400 px</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="divide-y divide-stone-100 p-0">
          {query.data?.map((banner) => (
            <div key={banner.id} className="flex items-center gap-4 p-4">
              {/* Preview thumbnail */}
              {banner.image_url && (
                <Image
                  src={banner.image_url}
                  alt={banner.title}
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rounded-lg border border-stone-100 object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900">{banner.title}</p>
                <p className="max-w-xl truncate text-sm text-stone-500">{banner.image_url}</p>
              </div>
              <Button
                size="sm"
                variant={banner.is_active ? "secondary" : "primary"}
                onClick={async () => {
                  await supabase
                    .from("banners")
                    .update({ is_active: !banner.is_active })
                    .eq("id", banner.id);
                  client.invalidateQueries({ queryKey: ["admin-banners-edit"] });
                }}
              >
                {banner.is_active ? "Hide" : "Show"}
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>
    </AdminShell>
  );
}
