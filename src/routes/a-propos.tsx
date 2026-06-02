import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";
import { resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos – Panorama P, résidence meublée à Bafoussam" },
      {
        name: "description",
        content:
          "Découvrez Panorama P : confort moderne, sécurité et localisation idéale au cœur de Bafoussam.",
      },
      { property: "og:title", content: "À propos – Panorama P" },
      { property: "og:description", content: "Confort, sécurité et localisation idéale à Bafoussam." },
    ],
    links: [{ rel: "canonical", href: "/a-propos" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useLanguage();

  const blocks = [
    { icon: Sparkles, title: t.about.comfortTitle, text: t.about.comfort },
    { icon: ShieldCheck, title: t.about.securityTitle, text: t.about.security },
    { icon: MapPin, title: t.about.locationTitle, text: t.about.location },
  ];

  return (
    <>
      <PageHeader title={t.about.title} subtitle={t.about.intro} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <img
              src={resolveImage("hero-residence")}
              alt={t.about.title}
              loading="lazy"
              width={1280}
              height={960}
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-elegant"
            />
          </Reveal>
          <div className="space-y-8">
            {blocks.map((b, i) => (
              <Reveal key={b.title} delay={i * 100}>
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-gold text-gold-foreground shadow-gold">
                    <b.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {b.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
            <Button asChild variant="gold" size="lg">
              <Link to="/logements">
                {t.about.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
