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

// Sentinel status used to represent manual maintenance blocks stored as
// reservation rows (no schema change). Excluded from all guest-facing lists,
// counts and revenue so it never pollutes real reservation business logic.
export const BLOCK_STATUS = "bloqué";

// Admin-only: list reservations (verified server-side). Maintenance blocks are
// excluded — they are surfaced only through the occupancy calendar.
export const adminListReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("reservations")
      .select("*")
      .neq("status", BLOCK_STATUS)
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

    // Captured for the optional reply notification email.
    let replyRecipient: string | null = null;
    let replyRecipientName = "";
    let replyOriginal = "";
    let replyText = "";

    if (data.reply !== undefined) {
      const { data: row, error: fetchErr } = await context.supabase
        .from("messages")
        .select("message, email, name")
        .eq("id", data.id)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const content = stripMessageMeta(row.message);
      const meta = parseMessageMeta(row.message) ?? {};
      meta.reply = data.reply.trim();
      meta.repliedAt = new Date().toISOString();
      updates.message = encodeMessage(content, meta);
      if (!data.status) updates.status = "répondu";

      replyRecipient = (row.email as string | null) ?? null;
      replyRecipientName = (row.name as string | null) ?? "";
      replyOriginal = content;
      replyText = data.reply.trim();
    }

    if (Object.keys(updates).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("messages")
      .update(updates)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Send the branded admin-reply email (best-effort, never blocks the save).
    if (replyRecipient && replyText) {
      try {
        const { enqueueAppEmail } = await import("@/lib/email/enqueue.server");
        await enqueueAppEmail({
          templateName: "admin-reply",
          recipientEmail: replyRecipient,
          idempotencyKey: `admin-reply-${data.id}-${Date.now()}`,
          templateData: {
            name: replyRecipientName || "cher client",
            reply: replyText,
            originalMessage: replyOriginal.slice(0, 600),
          },
        });
      } catch (e) {
        console.error("Failed to send admin-reply email", e);
      }
    }

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

// Admin-only: aggregate business metrics for the dashboard cards. Uses the
// RLS-scoped admin client; counts only, no rows transferred (head: true).
export const adminGetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const count = async (
      q: PromiseLike<{ count: number | null; error: { message: string } | null }>,
    ): Promise<number> => {
      const { count: c, error } = await q;
      if (error) throw new Error(error.message);
      return c ?? 0;
    };
    const [
      totalReservations,
      pendingReservations,
      confirmedReservations,
      completedReservations,
      totalUsers,
      newMessages,
      pendingReviews,
    ] = await Promise.all([
      count(sb.from("reservations").select("*", { count: "exact", head: true }).neq("status", BLOCK_STATUS)),
      count(sb.from("reservations").select("*", { count: "exact", head: true }).eq("status", "nouvelle")),
      count(sb.from("reservations").select("*", { count: "exact", head: true }).eq("status", "confirmée")),
      count(sb.from("reservations").select("*", { count: "exact", head: true }).eq("status", "terminée")),
      count(sb.from("profiles").select("*", { count: "exact", head: true })),
      count(sb.from("messages").select("*", { count: "exact", head: true }).neq("status", "répondu")),
      count(sb.from("testimonials").select("*", { count: "exact", head: true }).lt("sort_order", 0)),
    ]);
    return {
      totalReservations,
      pendingReservations,
      confirmedReservations,
      completedReservations,
      totalUsers,
      newMessages,
      pendingReviews,
    };
  });

// Admin-only: update a reservation's lifecycle status.
export const adminUpdateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["nouvelle", "confirmée", "terminée", "annulée"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: list all reviews with their full text for moderation. Pending
// reviews use sort_order < 0 (see PENDING_SORT_ORDER); approved use >= 0.
export const adminListReviewsFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("testimonials")
      .select("id, name, location, rating, message_fr, sort_order, created_at, user_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Admin-only: approve (publish) or hide a review without any schema change.
export const adminModerateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), action: z.enum(["approve", "hide"]) })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sort_order = data.action === "approve" ? 0 : -1;
    const { error } = await context.supabase
      .from("testimonials")
      .update({ sort_order })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: overview of registered users with their activity counts. Emails
// live in auth.users, so this uses the service-role admin client (after the
// server-side admin check) to join profile + auth + activity data.
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, created_at");
    if (pErr) throw new Error(pErr.message);

    const emailMap = new Map<string, string>();
    for (let page = 1; ; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw new Error(error.message);
      for (const u of list.users) if (u.email) emailMap.set(u.id, u.email);
      if (list.users.length < 1000) break;
    }

    const [resRows, revRows, msgRows] = await Promise.all([
      supabaseAdmin.from("reservations").select("user_id"),
      supabaseAdmin.from("testimonials").select("user_id"),
      supabaseAdmin.from("messages").select("user_id"),
    ]);

    const tally = (rows: { user_id: string | null }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) {
        if (r.user_id) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
      }
      return m;
    };
    const resMap = tally(resRows.data);
    const revMap = tally(revRows.data);
    const msgMap = tally(msgRows.data);

    return (profiles ?? [])
      .map((p) => ({
        id: p.id,
        full_name: p.full_name as string | null,
        email: emailMap.get(p.id) ?? null,
        created_at: p.created_at as string,
        reservations: resMap.get(p.id) ?? 0,
        reviews: revMap.get(p.id) ?? 0,
        messages: msgMap.get(p.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  });

// Admin-only: collaborative "Manager Activity" view for the residence team.
// No schema change: the admin roster comes from user_roles + auth metadata,
// and the activity feed is DERIVED from existing data (reservation statuses,
// replied messages, moderated reviews). Read-only; core workflows untouched.
export const adminGetManagerActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Admin roster -----------------------------------------------------
    const { data: roleRows, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (rErr) throw new Error(rErr.message);
    const adminIds = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));

    const authMap = new Map<string, { email: string | null; lastSignIn: string | null }>();
    for (let page = 1; ; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        authMap.set(u.id, {
          email: u.email ?? null,
          lastSignIn: u.last_sign_in_at ?? null,
        });
      }
      if (list.users.length < 1000) break;
    }

    const nameMap = new Map<string, string | null>();
    if (adminIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);
      for (const p of profs ?? []) nameMap.set(p.id, p.full_name as string | null);
    }

    const admins = adminIds.map((id) => {
      const auth = authMap.get(id);
      return {
        id,
        full_name: nameMap.get(id) ?? null,
        email: auth?.email ?? null,
        last_sign_in_at: auth?.lastSignIn ?? null,
      };
    });

    // 2. Derived activity feed -------------------------------------------
    type FeedItem = {
      id: string;
      kind:
        | "reservation_confirmée"
        | "reservation_terminée"
        | "reservation_annulée"
        | "message_reply"
        | "review_approved"
        | "review_hidden";
      name: string;
      at: string;
    };
    const feed: FeedItem[] = [];

    const [resRows, msgRows, revRows] = await Promise.all([
      supabaseAdmin
        .from("reservations")
        .select("id, name, status, created_at")
        .neq("status", "nouvelle")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("messages")
        .select("id, name, message")
        .order("created_at", { ascending: false })
        .limit(80),
      supabaseAdmin
        .from("testimonials")
        .select("id, name, sort_order, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    for (const r of resRows.data ?? []) {
      const k =
        r.status === "confirmée"
          ? "reservation_confirmée"
          : r.status === "terminée"
            ? "reservation_terminée"
            : r.status === "annulée"
              ? "reservation_annulée"
              : null;
      if (k) feed.push({ id: `res-${r.id}`, kind: k, name: r.name, at: r.created_at });
    }

    for (const m of msgRows.data ?? []) {
      const meta = parseMessageMeta(m.message);
      if (meta?.repliedAt) {
        feed.push({
          id: `msg-${m.id}`,
          kind: "message_reply",
          name: m.name,
          at: meta.repliedAt,
        });
      }
    }

    for (const v of revRows.data ?? []) {
      feed.push({
        id: `rev-${v.id}`,
        kind: (v.sort_order as number) < 0 ? "review_hidden" : "review_approved",
        name: v.name,
        at: v.created_at as string,
      });
    }

    feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return { admins, feed: feed.slice(0, 40) };
  });

// ── Physical units (logement_units) ──────────────────────────────────────
// Admin-only: list every physical unit (including unavailable) with its
// parent category type. Read is RLS-allowed for authenticated; the admin
// check keeps this endpoint admin-scoped for consistency.
export const adminListUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("logement_units")
      .select("id, logement_id, label, unit_number, available, sort_order, logements(type, title_fr)")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((u) => {
      const parent = (u as { logements: { type: string; title_fr: string } | null }).logements;
      return {
        id: u.id as string,
        logement_id: u.logement_id as string,
        label: u.label as string,
        unit_number: u.unit_number as number,
        available: u.available as boolean,
        sort_order: u.sort_order as number,
        type: parent?.type ?? "",
        category_title: parent?.title_fr ?? "",
      };
    });
  });

export const adminCreateUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logement_id: z.string().uuid(),
        label: z.string().min(1).max(120),
        unit_number: z.number().int().min(1).max(999),
        available: z.boolean().optional(),
        sort_order: z.number().int().min(0).max(9999).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("logement_units").insert({
      logement_id: data.logement_id,
      label: data.label.trim(),
      unit_number: data.unit_number,
      available: data.available ?? true,
      sort_order: data.sort_order ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        label: z.string().min(1).max(120).optional(),
        unit_number: z.number().int().min(1).max(999).optional(),
        available: z.boolean().optional(),
        sort_order: z.number().int().min(0).max(9999).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const updates: {
      label?: string;
      unit_number?: number;
      available?: boolean;
      sort_order?: number;
    } = {};
    if (data.label !== undefined) updates.label = data.label.trim();
    if (data.unit_number !== undefined) updates.unit_number = data.unit_number;
    if (data.available !== undefined) updates.available = data.available;
    if (data.sort_order !== undefined) updates.sort_order = data.sort_order;
    if (Object.keys(updates).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("logement_units")
      .update(updates)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("logement_units")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: assign (or clear) the physical unit linked to a reservation.
export const adminAssignReservationUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reservationId: z.string().uuid(),
        unitId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("reservations")
      .update({ logement_unit_id: data.unitId })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: occupancy data for the calendar — all units plus non-cancelled
// reservations with their dates and assigned unit (null = unassigned legacy).
export const adminGetOccupancy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const [unitsRes, resRes] = await Promise.all([
      sb
        .from("logement_units")
        .select("id, label, sort_order, available, logements(type)")
        .order("sort_order", { ascending: true }),
      sb
        .from("reservations")
        .select("id, name, phone, email, guests, arrival_date, departure_date, status, logement_unit_id, logement_type, message")
        .neq("status", "annulée")
        .order("arrival_date", { ascending: true }),
    ]);
    if (unitsRes.error) throw new Error(unitsRes.error.message);
    if (resRes.error) throw new Error(resRes.error.message);

    const units = (unitsRes.data ?? []).map((u) => {
      const parent = (u as { logements: { type: string } | null }).logements;
      return {
        id: u.id as string,
        label: u.label as string,
        available: u.available as boolean,
        type: parent?.type ?? "",
      };
    });
    return { units, reservations: resRes.data ?? [] };
  });

// ── Hotel KPIs ────────────────────────────────────────────────────────────
// Admin-only: aggregate operational KPIs for the intelligent dashboard. All
// values are DERIVED from existing reservations + units + logement prices.
// Maintenance blocks (BLOCK_STATUS) and cancelled rows are excluded from every
// metric so they never distort revenue or occupancy.
export const adminGetHotelKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;

    const [unitsRes, resRes] = await Promise.all([
      sb
        .from("logement_units")
        .select("id, available, logements(type, price)"),
      sb
        .from("reservations")
        .select("status, arrival_date, departure_date, logement_unit_id, logement_type")
        .neq("status", "annulée")
        .neq("status", BLOCK_STATUS),
    ]);
    if (unitsRes.error) throw new Error(unitsRes.error.message);
    if (resRes.error) throw new Error(resRes.error.message);

    type UnitRow = { id: string; available: boolean; logements: { type: string; price: number } | null };
    const units = (unitsRes.data ?? []) as unknown as UnitRow[];
    const reservations = (resRes.data ?? []) as {
      status: string;
      arrival_date: string;
      departure_date: string;
      logement_unit_id: string | null;
      logement_type: string | null;
    }[];

    const totalUnits = units.length;
    const availableUnits = units.filter((u) => u.available).length;
    const priceByUnit = new Map<string, number>();
    const priceByType = new Map<string, number>();
    for (const u of units) {
      const price = Number(u.logements?.price ?? 0);
      priceByUnit.set(u.id, price);
      if (u.logements?.type && !priceByType.has(u.logements.type)) {
        priceByType.set(u.logements.type, price);
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysInMonth = Math.round(
      (monthEnd.getTime() - monthStart.getTime()) / 86_400_000,
    );
    const msIso = monthStart.toISOString().slice(0, 10);
    const meIso = monthEnd.toISOString().slice(0, 10);

    const nights = (a: string, d: string) =>
      Math.max(0, Math.round((Date.parse(d) - Date.parse(a)) / 86_400_000));
    const overlapNights = (a: string, d: string, from: string, to: string) => {
      const s = a > from ? a : from;
      const e = d < to ? d : to;
      return e > s ? nights(s, e) : 0;
    };
    const priceOf = (r: { logement_unit_id: string | null; logement_type: string | null }) =>
      (r.logement_unit_id ? priceByUnit.get(r.logement_unit_id) : undefined) ??
      (r.logement_type ? priceByType.get(r.logement_type) : undefined) ??
      0;

    let confirmedReservations = 0;
    let pendingReservations = 0;
    let estimatedRevenue = 0;
    let totalStayNights = 0;
    let stayCount = 0;
    let todayArrivals = 0;
    let todayDepartures = 0;
    let occupiedUnitNightsThisMonth = 0;
    const occupiedUnitsToday = new Set<string>();

    for (const r of reservations) {
      if (r.status === "confirmée") confirmedReservations++;
      if (r.status === "nouvelle") pendingReservations++;

      const n = nights(r.arrival_date, r.departure_date);
      if (n > 0) {
        totalStayNights += n;
        stayCount++;
      }
      if (r.status === "confirmée" || r.status === "terminée") {
        estimatedRevenue += n * priceOf(r);
      }
      if (r.arrival_date === today) todayArrivals++;
      if (r.departure_date === today) todayDepartures++;
      if (r.logement_unit_id && r.arrival_date <= today && r.departure_date > today) {
        occupiedUnitsToday.add(r.logement_unit_id);
      }
      if (r.logement_unit_id) {
        occupiedUnitNightsThisMonth += overlapNights(
          r.arrival_date,
          r.departure_date,
          msIso,
          meIso,
        );
      }
    }

    const capacity = totalUnits * daysInMonth;
    const occupancyRate = capacity > 0
      ? Math.round((occupiedUnitNightsThisMonth / capacity) * 100)
      : 0;
    const avgStay = stayCount > 0
      ? Math.round((totalStayNights / stayCount) * 10) / 10
      : 0;

    return {
      occupancyRate,
      confirmedReservations,
      pendingReservations,
      estimatedRevenue: Math.round(estimatedRevenue),
      avgStay,
      todayArrivals,
      todayDepartures,
      occupiedUnits: occupiedUnitsToday.size,
      availableUnits: Math.max(0, availableUnits - occupiedUnitsToday.size),
      totalUnits,
    };
  });

// Admin-only: create a maintenance block on a unit for a date range. Stored as
// a reservation row with the BLOCK_STATUS sentinel (no schema change).
export const adminBlockDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        unitId: z.string().uuid(),
        arrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        departure: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().max(200).optional(),
      })
      .refine((v) => v.departure > v.arrival, { message: "Invalid range" })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("reservations").insert({
      name: data.reason?.trim() || "Maintenance",
      phone: "—",
      arrival_date: data.arrival,
      departure_date: data.departure,
      guests: 1,
      status: BLOCK_STATUS,
      logement_unit_id: data.unitId,
      message: "MAINTENANCE",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: remove a maintenance block (only deletes rows flagged as blocks).
export const adminUnblockDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("reservations")
      .delete()
      .eq("id", data.id)
      .eq("status", BLOCK_STATUS);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: edit a reservation's arrival / departure dates (quick action).
export const adminUpdateReservationDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        arrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        departure: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .refine((v) => v.departure > v.arrival, { message: "Invalid range" })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("reservations")
      .update({ arrival_date: data.arrival, departure_date: data.departure })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
