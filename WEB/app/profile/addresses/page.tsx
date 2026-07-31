"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthProfile } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/modal";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { DbAddress } from "@/types/database";

export default function AddressesPage() {
  const { data: auth } = useAuthProfile();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return [];
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbAddress[];
    },
    enabled: !!auth?.user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses", auth?.user?.id] });
      success("Address deleted");
      setDeletingId(null);
    },
    onError: (err) => {
      toastError("Failed to delete", err.message);
      setDeletingId(null);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      // Unset previous default
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", auth!.user!.id)
        .eq("is_default", true);
      // Set new default
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses", auth?.user?.id] });
      success("Default address updated");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-stone-900">Saved Addresses</h2>
        {/* We will add an Address Modal later when we build Checkout */}
        <Button size="sm" className="gap-2" onClick={() => toastError("Not implemented", "Add address via checkout for now.")}>
          <Plus className="size-4" />
          Add New
        </Button>
      </div>

      {!addresses?.length ? (
        <EmptyState
          icon={<MapPin />}
          title="No addresses found"
          body="You haven't saved any delivery addresses yet."
          action={
            <Button onClick={() => toastError("Not implemented", "Add address via checkout for now.")}>
              Add Address
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id} className="relative overflow-hidden">
              {address.is_default && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  Default
                </div>
              )}
              <CardBody className="flex h-full flex-col p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                    <MapPin className="size-4" />
                  </div>
                  <h3 className="font-bold text-stone-900">{address.label}</h3>
                </div>
                
                <div className="mb-4 flex-1 text-sm text-stone-600">
                  <p>{address.flat_no ? `${address.flat_no}, ` : ""}{address.full_address}</p>
                  {address.landmark && <p className="mt-1 text-stone-400">Landmark: {address.landmark}</p>}
                </div>

                <div className="flex items-center gap-2 border-t border-stone-100 pt-3">
                  {!address.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-stone-500 hover:text-stone-900"
                      onClick={() => setDefaultMutation.mutate(address.id)}
                      loading={setDefaultMutation.isPending}
                    >
                      Set Default
                    </Button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => setDeletingId(address.id)}
                    className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Address"
        description="Are you sure you want to delete this address? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
