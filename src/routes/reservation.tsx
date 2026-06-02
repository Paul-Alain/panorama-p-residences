import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { ReservationForm } from "@/components/forms/reservation-form";
import { useLanguage } from "@/lib/i18n/language-context";

interface ReservationSearch {
  logement?: string;
}

export const Route = createFileRoute("/reservation")({
  validateSearch: (search: Record<string, unknown>): ReservationSearch => ({
    logement: typeof search.logement === "string" ? search.logement : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Réservation – Panorama P à Bafoussam" },
      {
        name: "description",
        content:
          "Envoyez votre demande de réservation pour un studio, une chambre ou un appartement meublé à Bafoussam.",
      },
      { property: "og:title", content: "Réservation – Panorama P" },
      { property: "og:description", content: "Demande de réservation en quelques clics." },
    ],
    links: [{ rel: "canonical", href: "/reservation" }],
  }),
  component: ReservationPage,
});

function ReservationPage() {
  const { t } = useLanguage();
  const { logement } = Route.useSearch();

  return (
    <>
      <PageHeader title={t.reservation.title} subtitle={t.reservation.subtitle} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-elegant sm:p-9">
            <ReservationForm defaultType={logement ?? ""} />
          </div>
        </div>
      </section>
    </>
  );
}
