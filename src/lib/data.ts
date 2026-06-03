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
  return value ?? "";
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
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Testimonial[];
  },
});

export const formatPrice = (price: number, currency: string) =>
  `${price} ${currency}`;
