import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus } from "@/lib/admin.functions";

/**
 * Reliable, always-fresh admin detection.
 *
 * - Tracks the live Supabase session (re-fetches on login / logout / token
 *   refresh, so the role is never stale after reload).
 * - Calls the server-verified `getAdminStatus` (uses the RLS-scoped client +
 *   `has_role()` against `user_roles`) keyed by the current user id.
 */
export function useAdminStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const runGetAdminStatus = useServerFn(getAdminStatus);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setSessionReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const query = useQuery({
    queryKey: ["admin-status", userId],
    enabled: sessionReady && !!userId,
    staleTime: 0,
    queryFn: async () => {
      const res = await runGetAdminStatus();
      // Temporary debug: confirm the authenticated user id and resolved role.
      console.log("[admin-status] userId:", userId, "isAdmin:", res.isAdmin);
      return res;
    },
  });

  return {
    userId,
    isAdmin: query.data?.isAdmin === true,
    roles: query.data?.roles ?? [],
    // "Loading" until we know the session AND (if signed in) the role result.
    loading: !sessionReady || (!!userId && query.isLoading),
  };
}
