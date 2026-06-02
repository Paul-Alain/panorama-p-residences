import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Reveal } from "@/components/ui/reveal";
import { resolveImage, galleryImages } from "@/lib/assets";
import { useLanguage } from "@/lib/i18n/language-context";

const labels: Record<string, Record<string, string>> = {
  salon: { fr: "Salon", de: "Wohnzimmer", en: "Lounge" },
  chambre: { fr: "Chambre", de: "Zimmer", en: "Bedroom" },
  cuisine: { fr: "Cuisine", de: "Küche", en: "Kitchen" },
  douche: { fr: "Salle de douche", de: "Dusche", en: "Bathroom" },
  vue: { fr: "Vue panoramique", de: "Panoramablick", en: "Panoramic view" },
  exterieur: { fr: "Extérieur", de: "Außenbereich", en: "Exterior" },
  studio: { fr: "Studio", de: "Studio", en: "Studio" },
  appartement: { fr: "Appartement", de: "Apartment", en: "Apartment" },
};

export function GalleryGrid() {
  const { lang } = useLanguage();
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {galleryImages.map((img, i) => (
          <Reveal
            key={img.id}
            delay={(i % 3) * 80}
            className={i % 5 === 0 ? "sm:col-span-2 sm:row-span-2" : ""}
          >
            <button
              onClick={() => setActive(i)}
              className="group relative block h-full w-full overflow-hidden rounded-2xl"
            >
              <img
                src={resolveImage(img.id)}
                alt={labels[img.key]?.[lang] ?? img.key}
                loading="lazy"
                width={1280}
                height={960}
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="p-4 text-sm font-medium text-white">
                  {labels[img.key]?.[lang] ?? img.key}
                </span>
              </div>
            </button>
          </Reveal>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          {active !== null && (
            <div className="relative">
              <img
                src={resolveImage(galleryImages[active].id)}
                alt={labels[galleryImages[active].key]?.[lang] ?? ""}
                className="w-full rounded-xl object-contain"
              />
              <button
                onClick={() => setActive(null)}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
