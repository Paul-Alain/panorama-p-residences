import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";
import accueilResidence from "@/assets/accueil-residence.jpg.asset.json";
import logoMark from "@/assets/logo-panorama-p.png.asset.json";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative isolate overflow-hidden">
      <img
        src={accueilResidence.url}
        alt="Panorama P – résidence meublée à Bafoussam"
        width={1920}
        height={1080}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.2 0.01 60 / 0.25) 0%, oklch(0.18 0.01 60 / 0.15) 40%, oklch(0.16 0.01 60 / 0.50) 100%)",
        }}
      />

      <div className="mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute top-4 left-3 sm:top-5 sm:left-5 lg:top-6 lg:left-8">
          <div className="rounded-full bg-gold/20 p-1.5 shadow-[0_0_30px_rgba(201,168,76,0.45)] backdrop-blur-sm sm:p-2.5">
            <img
              src={logoMark.url}
              alt="Panorama P Residence"
              className="h-20 w-20 rounded-full border-[3px] border-gold object-cover sm:h-28 sm:w-28 lg:h-32 lg:w-32"
            />
          </div>
        </div>
        <div className="max-w-3xl animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-gold" />
            {t.hero.badge}
          </span>

          <h1 className="mt-6 font-display font-semibold leading-[1.05] text-balance text-primary-foreground">
            <span className="block text-4xl sm:text-6xl lg:text-7xl">
              {t.hero.titleMain}
            </span>
            <span className="mt-2 block text-xl font-medium sm:text-2xl lg:text-3xl text-primary-foreground/90">
              {t.hero.titleSub}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/85">
            {t.hero.subtitle}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="xl">
              <Link to="/logements">
                {t.hero.viewLogements}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="hero" size="xl">
              <Link to="/reservation">{t.hero.book}</Link>
            </Button>
            <Button asChild variant="heroOutline" size="xl">
              <Link to="/contact">{t.hero.contact}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
