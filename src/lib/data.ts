import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n/translations";

export interface Logement {
  id: string;
  type: string;
  title_fr: string;
  title_de: string | null;
  title_en: string | null;
  description_fr: string | null;
  description_de: string | null;
  description_en: string | null;
  price: number;
  currency: string;
  price_unit: string;
  equipments: string[];
  images: string[];
  available: boolean;
  sort_order: number;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  message_fr: string;
  message_de: string | null;
  message_en: string | null;
  sort_order: number;
}

export function localized(row: object, base: string, lang: Lang): string {
  const r = row as Record<string, unknown>;
  const value = (r[`${base}_${lang}`] ?? r[`${base}_fr`]) as string | null;
  return stripReviewMeta(value ?? "");
}

/**
 * Customer reviews are stored in the existing `testimonials` table without any
 * schema change. Detailed sub-ratings and the originating reservation id are
 * encoded as a trailing JSON block in `message_fr`, delimited by this marker.
 * Pending (unapproved) reviews use `sort_order = -1` so they never appear on
 * the public site until an admin promotes them.
 */
export const REVIEW_META_MARKER = "\n\n⟦pp-review⟧";
export const PENDING_SORT_ORDER = -1;

export interface ReviewMeta {
  reservationId?: string;
  cleanliness?: number;
  comfort?: number;
  security?: number;
  hospitality?: number;
  value?: number;
}

export function encodeReview(comment: string, meta: ReviewMeta): string {
  return `${comment.trim()}${REVIEW_META_MARKER}${JSON.stringify(meta)}`;
}

export function stripReviewMeta(text: string): string {
  return text.split(REVIEW_META_MARKER)[0].trim();
}

export function parseReviewMeta(text: string): ReviewMeta | null {
  const idx = text.indexOf(REVIEW_META_MARKER);
  if (idx === -1) return null;
  try {
    return JSON.parse(text.slice(idx + REVIEW_META_MARKER.length)) as ReviewMeta;
  } catch {
    return null;
  }
}

/**
 * Customer support messages reuse the existing `messages` table without any
 * schema change. The optional subject, linked reservation id and the admin
 * reply are encoded as a trailing JSON block in the `message` column, delimited
 * by this marker. The plain message body always precedes the marker so the
 * existing contact-form / admin listings stay human-readable.
 */
export const MESSAGE_META_MARKER = "\n\n⟦pp-msg⟧";

export interface MessageMeta {
  subject?: string;
  reservationId?: string;
  reply?: string;
  repliedAt?: string;
}

export function encodeMessage(content: string, meta: MessageMeta): string {
  const clean: MessageMeta = {};
  if (meta.subject) clean.subject = meta.subject;
  if (meta.reservationId) clean.reservationId = meta.reservationId;
  if (meta.reply) clean.reply = meta.reply;
  if (meta.repliedAt) clean.repliedAt = meta.repliedAt;
  return `${content.trim()}${MESSAGE_META_MARKER}${JSON.stringify(clean)}`;
}

export function stripMessageMeta(text: string): string {
  return text.split(MESSAGE_META_MARKER)[0].trim();
}

export function parseMessageMeta(text: string): MessageMeta | null {
  const idx = text.indexOf(MESSAGE_META_MARKER);
  if (idx === -1) return null;
  try {
    return JSON.parse(text.slice(idx + MESSAGE_META_MARKER.length)) as MessageMeta;
  } catch {
    return null;
  }
}

export const logementsQuery = queryOptions({
  queryKey: ["logements"],
  queryFn: async (): Promise<Logement[]> => {
    const { data, error } = await supabase
      .from("logements")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Logement[];
  },
});

export const testimonialsQuery = queryOptions({
  queryKey: ["testimonials"],
  queryFn: async (): Promise<Testimonial[]> => {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .gte("sort_order", 0)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Testimonial[];
  },
});

export const formatPrice = (price: number, currency: string) =>
  `${price} ${currency}`;
