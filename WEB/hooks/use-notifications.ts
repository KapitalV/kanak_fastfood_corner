"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { DbNotification } from "@/types/database";
import { useAuthProfile } from "@/components/use-auth-profile";

export function useNotifications() {
  const { data: auth } = useAuthProfile();
  const queryClient = useQueryClient();
  const userId = auth?.user?.id;
  const query = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [] as DbNotification[];
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(25);
      if (error) throw error;
      return data as DbNotification[];
    },
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notifications-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] })).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    await queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
  };

  return { ...query, notifications: query.data ?? [], unreadCount: (query.data ?? []).filter((item) => !item.is_read).length, markAllRead };
}
