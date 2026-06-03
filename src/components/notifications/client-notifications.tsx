import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  buildClientNotifications,
  type NotifMessage,
  type NotifReservation,
  type NotifReview,
} from "@/lib/notifications";
import { NotificationCenter } from "./notification-center";

export function ClientNotifications({ userId }: { userId: string }) {
  const { t } = useLanguage();

  const { data: reservations = [] } = useQuery({
    queryKey: ["my-reservations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, name, arrival_date, departure_date, guests, logement_type, message, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NotifReservation[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["my-messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, message, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NotifMessage[];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["my-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("id, rating, location, message_fr, sort_order, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NotifReview[];
    },
  });

  const notifications = useMemo(
    () =>
      buildClientNotifications(t.notifications, {
        reservations,
        messages,
        reviews,
      }),
    [t.notifications, reservations, messages, reviews],
  );

  return <NotificationCenter scope={`client:${userId}`} notifications={notifications} />;
}
