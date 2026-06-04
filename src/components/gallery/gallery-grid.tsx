import { Link } from "@tanstack/react-router";
import { ArrowRight, Images, Play } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { gallerySections } from "@/lib/gallery";
import { useLanguage } from "@/lib/i18n/language-context";

export function GalleryGrid() {
  const { lang } = useLanguage();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {gallerySections.map((section, i) => (
        <Reveal key={section.id} delay={(i % 3) * 80}>
          <Link
            to="/galerie/$blockId"
            params={{ blockId: section.id }}
            className="group relative block overflow-hidden rounded-3xl shadow-elegant"
          >
            <img
              src={section.cover}
              alt={section.title[lang]}
              loading="lazy"
              width={1280}
              height={960}
              className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/70">
                  <Images className="h-3.5 w-3.5" />
                  {section.images.length} photos
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">
                  {section.title[lang]}
                </h2>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors group-hover:bg-gold group-hover:text-gold-foreground">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
