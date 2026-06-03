import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  adminListReservations,
  adminListMessages,
  adminListReviews,
} from "@/lib/admin.functions";
import {
  buildAdminNotifications,
  type NotifMessage,
  type NotifReservation,
  type NotifReview,
} from "@/lib/notifications";
import { NotificationCenter } from "./notification-center";

export function AdminNotifications({ adminId }: { adminId: string }) {
  const { t } = useLanguage();
  const runReservations = useServerFn(adminListReservations);
  const runMessages = useServerFn(adminListMessages);
  const runReviews = useServerFn(adminListReviews);

  const { data: reservations = [] } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: async () => (await runReservations()) as unknown as NotifReservation[],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => (await runMessages()) as unknown as NotifMessage[],
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await runReviews()) as unknown as NotifReview[],
  });

  const notifications = useMemo(
    () =>
      buildAdminNotifications(t.notifications, {
        reservations,
        messages,
        reviews,
      }),
    [t.notifications, reservations, messages, reviews],
  );

  return <NotificationCenter scope={`admin:${adminId}`} notifications={notifications} />;
}
