import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Navigation, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";
import { siteConfig, whatsappLink } from "@/lib/site-config";

export const Route = createFileRoute("/localisation")({
  head: () => ({
    meta: [
      { title: "Localisation – Panorama P à Bafoussam" },
      {
        name: "description",
        content:
          "Situé dans un quartier calme et accessible de Bafoussam. Retrouvez la résidence Panorama P sur la carte.",
      },
      { property: "og:title", content: "Localisation – Panorama P" },
      { property: "og:description", content: "Quartier calme et accessible de Bafoussam." },
    ],
    links: [{ rel: "canonical", href: "/localisation" }],
  }),
  component: LocalisationPage,
});

function LocalisationPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHeader title={t.location.title} subtitle={t.location.text} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-border/60 shadow-elegant">
              <iframe
                title="Carte Bafoussam – Panorama P"
                src={siteConfig.mapEmbedUrl}
                className="h-[420px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <Navigation className="h-4 w-4 text-gold" />
              <a
                href={siteConfig.mapLink}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-gold"
              >
                {t.location.openMaps}
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-5 rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-gold" />
              <p className="text-sm text-muted-foreground">{siteConfig.address}</p>
            </div>
            <div className="flex gap-3">
              <Phone className="h-5 w-5 shrink-0 text-gold" />
              <a href={whatsappLink()} className="text-sm text-muted-foreground hover:text-gold">
                {siteConfig.phoneDisplay}
              </a>
            </div>
            <div className="flex gap-3">
              <Mail className="h-5 w-5 shrink-0 text-gold" />
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-sm text-muted-foreground hover:text-gold"
              >
                {siteConfig.email}
              </a>
            </div>
            <Button asChild variant="gold" size="lg" className="mt-2">
              <a href={siteConfig.mapLink} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" />
                {t.location.openMaps}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
