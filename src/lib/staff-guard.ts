import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

/** Server-side guard: throws unless the user has any back-office role. */
export async function assertStaff(supabase: SB, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("is_staff", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden: staff role required");
}

/** Server-side guard: throws unless the user is an admin / owner. */
export async function assertAdminOrOwner(supabase: SB, userId: string): Promise<void> {
  const [{ data: a }, { data: o }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "proprietaire" }),
  ]);
  if (a !== true && o !== true) throw new Error("Forbidden: admin role required");
}

/**
 * Server-side guard for team management: only owners (admin / proprietaire)
 * and technicians may add or remove team members.
 */
export async function assertCanManageTeam(supabase: SB, userId: string): Promise<void> {
  const [{ data: a }, { data: o }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "proprietaire" }),
  ]);
  if (a !== true && o !== true)
    throw new Error("Forbidden: owner role required");
}

/** Returns the set of role strings held by the user. */
export async function getUserRoles(supabase: SB, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.role as string);
}

/** Best-effort display name for the acting user (profile full_name → "Équipe"). */
export async function actorName(supabase: SB, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return (data?.full_name as string | null)?.trim() || "Membre de l'équipe";
}

/** Insert an activity-log entry (best-effort; never throws to the caller). */
export async function logActivity(
  supabase: SB,
  entry: {
    userId: string;
    userName: string;
    action: string;
    objectType?: string;
    objectId?: string;
    summary?: string;
  },
): Promise<void> {
  try {
    await supabase.from("activity_log").insert({
      user_id: entry.userId,
      user_name: entry.userName,
      action: entry.action,
      object_type: entry.objectType ?? null,
      object_id: entry.objectId ?? null,
      summary: entry.summary ?? null,
    });
  } catch (e) {
    console.error("activity log failed", e);
  }
}
