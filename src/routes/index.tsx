import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Sparkles, Mountain, Wifi } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { LogementCard } from "@/components/logements/logement-card";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { useLanguage } from "@/lib/i18n/language-context";
import { logementsQuery } from "@/lib/data";
import { resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panorama P – Résidence meublée à Bafoussam" },
      {
        name: "description",
        content:
          "Studios et appartements meublés confortables à Bafoussam, dans un cadre moderne et sécurisé. Réservez votre séjour à la résidence Panorama P.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const icons = [ShieldCheck, Sparkles, Mountain, Wifi];

function Index() {
  const { t } = useLanguage();
  const { data: logements = [] } = useQuery(logementsQuery);

  return (
    <>
      <Hero />

      {/* Highlights */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Panorama P"
            title={t.highlights.title}
            subtitle={t.highlights.subtitle}
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.highlights.items.map((item, i) => {
              const Icon = icons[i];
              return (
                <Reveal key={item.title} delay={i * 80}>
                  <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-shadow hover:shadow-elegant">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold text-gold-foreground shadow-gold">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* About teaser */}
      <section className="bg-secondary/40 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <img
              src={resolveImage("gallery-salon")}
              alt={t.about.title}
              loading="lazy"
              width={1280}
              height={960}
              className="aspect-[5/4] w-full rounded-3xl object-cover shadow-elegant"
            />
          </Reveal>
          <Reveal delay={120}>
            <SectionHeading
              eyebrow={t.nav.about}
              title={t.about.title}
              align="left"
            />
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {t.about.intro}
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {t.about.comfort}
            </p>
            <Button asChild variant="gold" size="lg" className="mt-7">
              <Link to="/a-propos">
                {t.common.learnMore}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Logements */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t.nav.logements}
            title={t.logements.title}
            subtitle={t.logements.subtitle}
          />
          <div className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {logements.map((l) => (
              <LogementCard key={l.id} logement={l} />
            ))}
          </div>
        </div>
      </section>

      {/* Gallery teaser */}
      <section className="bg-secondary/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t.nav.gallery}
            title={t.gallery.title}
            subtitle={t.gallery.subtitle}
          />
          <div className="mt-14">
            <GalleryGrid />
          </div>
        </div>
      </section>

      <TestimonialsSection />

      {/* Reservation CTA */}
      <section className="relative isolate overflow-hidden bg-primary py-20 text-primary-foreground sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-balance text-primary-foreground sm:text-4xl">
            {t.reservation.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/75">
            {t.reservation.subtitle}
          </p>
          <Button asChild variant="gold" size="xl" className="mt-8">
            <Link to="/reservation">
              {t.hero.book}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
