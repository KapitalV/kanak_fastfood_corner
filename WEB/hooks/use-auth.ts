"use client";

import { supabase } from "@/lib/supabase";
import type { AuthState } from "@/types/domain";
import type { DbProfile } from "@/types/database";
import { useQuery } from "@tanstack/react-query";

export function useAuthProfile() {
  return useQuery<AuthState>({
    queryKey: ["auth-profile"],
    queryFn: async (): Promise<AuthState> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return { user: null, profile: null };

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      return {
        user: {
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
        },
        profile: profile as DbProfile | null,
      };
    },
    staleTime: 60_000,
  });
}

export function useIsAuthenticated() {
  const { data } = useAuthProfile();
  return Boolean(data?.user);
}

export function useCurrentRole() {
  const { data } = useAuthProfile();
  return data?.profile?.role ?? null;
}
