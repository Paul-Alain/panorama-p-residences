import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Reveal } from "@/components/ui/reveal";
import { resolveImage, galleryImages } from "@/lib/assets";
import { useLanguage } from "@/lib/i18n/language-context";

const labels: Record<string, Record<string, string>> = {
  facade: { fr: "Façade de la résidence", de: "Fassade der Residenz", en: "Residence facade" },
  cote: { fr: "Vue extérieure", de: "Außenansicht", en: "Exterior view" },
  vue: { fr: "Allée & vue panoramique", de: "Weg & Panoramablick", en: "Walkway & panoramic view" },
  jardin: { fr: "Jardin paysager", de: "Angelegter Garten", en: "Landscaped garden" },
  salon: { fr: "Salon & coin repas", de: "Wohn- & Essbereich", en: "Living & dining area" },
  salonLed: { fr: "Séjour & cuisine équipée", de: "Wohnraum & Einbauküche", en: "Living room & fitted kitchen" },
  salonCuisine: { fr: "Espace de vie ouvert", de: "Offener Wohnbereich", en: "Open living space" },
  couloir: { fr: "Espace TV & couloir", de: "TV-Bereich & Flur", en: "TV area & hallway" },
  chambre: { fr: "Chambre confort", de: "Komfortzimmer", en: "Comfort bedroom" },
  chambreBleue: { fr: "Chambre élégante", de: "Elegantes Zimmer", en: "Elegant bedroom" },
  salleDeBain: { fr: "Salle d'eau moderne", de: "Modernes Bad", en: "Modern bathroom" },
  douche: { fr: "Douche & sanitaires", de: "Dusche & Sanitär", en: "Shower & bathroom" },
  solaire: { fr: "Installation solaire", de: "Solaranlage", en: "Solar installation" },
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
