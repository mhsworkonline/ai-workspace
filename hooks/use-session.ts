"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchSession, type SessionData } from "@/lib/api/workspace";
import { createClient } from "@/lib/supabase/client";

export const SESSION_QUERY_KEY = ["session"] as const;

export interface UseSessionResult {
  session: SessionData | null | undefined;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSession(): UseSessionResult {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
  });

  async function signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }

  return { session: data, isLoading, signOut, refresh };
}
