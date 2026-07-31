"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export function useAuthProfile() {
  return useQuery({
    queryKey: ["auth-profile"],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return { user: null, profile: null };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return { user, profile: profile as Profile | null };
    },
  });
}
