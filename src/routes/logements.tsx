import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { LogementCard } from "@/components/logements/logement-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n/language-context";
import { logementsQuery } from "@/lib/data";

export const Route = createFileRoute("/logements")({
  head: () => ({
    meta: [
      { title: "Logements – Studios & appartements meublés | Panorama P" },
      {
        name: "description",
        content:
          "Studios meublés, chambres et appartements à Bafoussam. Wi-Fi, cuisine, douche moderne, parking et sécurité. Réservez dès maintenant.",
      },
      { property: "og:title", content: "Nos logements – Panorama P" },
      { property: "og:description", content: "Studios, chambres et appartements meublés à Bafoussam." },
    ],
    links: [{ rel: "canonical", href: "/logements" }],
  }),
  component: LogementsPage,
});

function LogementsPage() {
  const { t } = useLanguage();
  const { data: logements = [], isLoading } = useQuery(logementsQuery);

  return (
    <>
      <PageHeader title={t.logements.title} subtitle={t.logements.subtitle} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : logements.length === 0 ? (
            <p className="text-center text-muted-foreground">{t.logements.empty}</p>
          ) : (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {logements.map((l) => (
                <LogementCard key={l.id} logement={l} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
