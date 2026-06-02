import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";
import { resolveImage } from "@/lib/assets";
import { formatPrice, localized, type Logement } from "@/lib/data";
import { getEquipment } from "@/lib/equipments";

export function LogementCard({ logement }: { logement: Logement }) {
  const { t, lang } = useLanguage();
  const title = localized(logement, "title", lang);
  const description = localized(logement, "description", lang);
  const cover = resolveImage(logement.images[0]);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={cover}
          alt={title}
          loading="lazy"
          width={1280}
          height={960}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <Badge className="bg-background/90 text-foreground hover:bg-background/90">
            {t.logements.types[logement.type as keyof typeof t.logements.types] ??
              logement.type}
          </Badge>
        </div>
        {!logement.available && (
          <div className="absolute right-3 top-3">
            <Badge variant="destructive">{t.logements.unavailable}</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {logement.equipments.slice(0, 5).map((eq) => {
            const { icon: Icon, label } = getEquipment(eq, lang);
            return (
              <span
                key={eq}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-gold" />
                {label}
              </span>
            );
          })}
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-border/60 pt-4">
          <div>
            <span className="text-xs text-muted-foreground">{t.logements.from}</span>
            <p className="font-display text-2xl font-semibold leading-none text-foreground">
              {formatPrice(logement.price, logement.currency)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                {t.logements.perNight}
              </span>
            </p>
          </div>
          <Button asChild variant="gold" size="sm" disabled={!logement.available}>
            <Link
              to="/reservation"
              search={{ logement: logement.type }}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              {t.logements.book}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
