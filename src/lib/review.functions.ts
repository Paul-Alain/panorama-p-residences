import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "@/lib/staff-guard";
import { enqueueAppEmail } from "@/lib/email/enqueue.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UUID = z.string().uuid();

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Générer un lien de notation ──────────────────────────────────────────
export const opGenerateReviewToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reservationId: UUID }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;

    // Récupérer la réservation
    const { data: res, error: e0 } = await sb
      .from("reservations")
      .select("id, name, email, phone, arrival_date, departure_date")
      .eq("id", data.reservationId)
      .single();
    if (e0 || !res) throw new Error("Réservation introuvable.");

    // Vérifier si un token existe déjà (non utilisé)
    const { data: existing } = await sb
      .from("review_tokens")
      .select("id, token, used, expires_at")
      .eq("reservation_id", data.reservationId)
      .maybeSingle();

    if (existing && !existing.used) {
      const siteUrl = process.env.VITE_SITE_URL ?? "https://panorama-p-residence.com";
      return {
        token: existing.token,
        url: `${siteUrl}/noter/${existing.token}`,
        alreadyExists: true,
      };
    }

    // Créer un nouveau token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: e1 } = await sb.from("review_tokens").insert({
      reservation_id: data.reservationId,
      token,
      guest_name: res.name,
      guest_email: res.email,
      guest_phone: res.phone,
      expires_at: expiresAt,
    });
    if (e1) throw new Error(e1.message);

    const siteUrl = process.env.VITE_SITE_URL ?? "https://panorama-p-residence.com";
    const reviewUrl = `${siteUrl}/noter/${token}`;

    return {
      token,
      url: reviewUrl,
      guestName: res.name,
      guestEmail: res.email,
      guestPhone: res.phone,
      alreadyExists: false,
    };
  });

// ── Envoyer le lien par email ────────────────────────────────────────────
export const opSendReviewEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      token:      z.string().min(1),
      email:      z.string().email(),
      guestName:  z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const siteUrl  = process.env.VITE_SITE_URL ?? "https://panorama-p-residence.com";
    const reviewUrl = `${siteUrl}/noter/${data.token}`;
    const result = await enqueueAppEmail({
      templateName:   "review-request",
      recipientEmail: data.email,
      templateData:   { name: data.guestName, reviewUrl },
      idempotencyKey: `review-${data.token}`,
    });
    if (!result.success) throw new Error("Impossible d'envoyer l'email.");
    return { sent: true };
  });

// ── Récupérer les infos d'un token (page publique) ───────────────────────
export const opGetReviewToken = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = supabaseAdmin;
    const { data: row, error } = await sb
      .from("review_tokens")
      .select("id, reservation_id, guest_name, used, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error || !row) return { valid: false, reason: "not_found" as const };
    if (row.used)   return { valid: false, reason: "used" as const };
    if (new Date(row.expires_at) < new Date()) return { valid: false, reason: "expired" as const };
    return {
      valid: true,
      tokenId:       row.id,
      reservationId: row.reservation_id,
      guestName:     row.guest_name,
    };
  });

// ── Soumettre un avis (page publique) ────────────────────────────────────
export const opSubmitReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      token:      z.string().min(1),
      name:       z.string().min(1).max(120),
      rating:     z.number().int().min(1).max(5),
      comment:    z.string().min(1).max(2000),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = supabaseAdmin;

    // Vérifier le token
    const { data: row, error: e0 } = await sb
      .from("review_tokens")
      .select("id, reservation_id, used, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (e0 || !row) throw new Error("Lien invalide.");
    if (row.used)   throw new Error("Cet avis a déjà été soumis.");
    if (new Date(row.expires_at) < new Date()) throw new Error("Ce lien a expiré.");

    // Créer l'avis — sort_order < 0 = en attente de modération
    const { error: e1 } = await sb.from("reviews").insert({
      name:            data.name,
      rating:          data.rating,
      message_fr:      data.comment,
      sort_order:      -1,  // en attente
      published:       false,
      review_token_id: row.id,
      reservation_id:  row.reservation_id,
      location:        null,
    });
    if (e1) throw new Error(e1.message);

    // Marquer le token comme utilisé
    await sb.from("review_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", row.id);

    return { success: true };
  });

// ── Lister les avis (admin) ──────────────────────────────────────────────
export const opListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("reviews")
      .select("id, name, rating, message_fr, sort_order, published, created_at, reservation_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ── Modérer un avis (admin) ──────────────────────────────────────────────
export const opModerateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id:     UUID,
      action: z.enum(["publish", "unpublish"]),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const published  = data.action === "publish";
    const sort_order = published ? 1 : -1;
    const { error } = await context.supabase
      .from("reviews")
      .update({ published, sort_order })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
