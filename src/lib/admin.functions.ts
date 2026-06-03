import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { encodeMessage, parseMessageMeta, stripMessageMeta } from "@/lib/data";

// Server-side admin verification. Uses the request's authenticated, RLS-scoped
// Supabase client and the has_role() security-definer function.
async function assertAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden: admin role required");
}

// Returns whether the current user is an admin (server-verified).
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: data === true };
  });

// Grants admin to the very first signed-in user. This is an atomic, one-time
// bootstrap enforced in the database (see bootstrap_admin): once the first
// admin is created it can never be triggered again, even if admin rows are
// later deleted. Returns whether the caller ends up an admin.
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Already an admin? Nothing to do.
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (existing) return { admin: true };

    // Atomic one-time bootstrap; returns false if already consumed.
    const { data, error } = await supabaseAdmin.rpc("bootstrap_admin", {
      _user_id: userId,
    });
    if (error) throw new Error(error.message);
    return { admin: data === true };
  });

// Admin-only: delete a logement (verified server-side, then RLS-scoped write).
export const adminDeleteLogement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("logements")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: list reservations (verified server-side).
export const adminListReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Admin-only: list contact messages (verified server-side).
export const adminListMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Admin-only: update a message status and/or store a reply. The reply is kept
// in the existing `message` column via an encoded meta block (no schema change).
export const adminUpdateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["nouveau", "lu", "répondu"]).optional(),
        reply: z.string().max(5000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const updates: { status?: string; message?: string } = {};
    if (data.status) updates.status = data.status;

    if (data.reply !== undefined) {
      const { data: row, error: fetchErr } = await context.supabase
        .from("messages")
        .select("message")
        .eq("id", data.id)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const content = stripMessageMeta(row.message);
      const meta = parseMessageMeta(row.message) ?? {};
      meta.reply = data.reply.trim();
      meta.repliedAt = new Date().toISOString();
      updates.message = encodeMessage(content, meta);
      if (!data.status) updates.status = "répondu";
    }

    if (Object.keys(updates).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("messages")
      .update(updates)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: list all reviews/testimonials (including pending, sort_order < 0)
// ordered by newest. Used to build admin notifications. No schema change.
export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("testimonials")
      .select("id, name, rating, sort_order, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
