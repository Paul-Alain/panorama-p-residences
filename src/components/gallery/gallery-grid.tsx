import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Reveal } from "@/components/ui/reveal";
import { gallerySections } from "@/lib/gallery";
import { useLanguage } from "@/lib/i18n/language-context";

export function GalleryGrid() {
  const { lang } = useLanguage();
  // active holds the currently open lightbox image url (or null)
  const [active, setActive] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-16 sm:space-y-20">
        {gallerySections.map((section) => (
          <section key={section.id}>
            <Reveal>
              <h2 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">
                {section.title[lang]}
              </h2>
            </Reveal>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {section.images.map((img, i) => (
                <Reveal
                  key={`${section.id}-${i}`}
                  delay={(i % 3) * 80}
                  className={i % 5 === 0 ? "sm:col-span-2 sm:row-span-2" : ""}
                >
                  <button
                    onClick={() => setActive(img.url)}
                    className="group relative block h-full w-full overflow-hidden rounded-2xl"
                  >
                    <img
                      src={img.url}
                      alt={img.alt[lang]}
                      loading="lazy"
                      width={1280}
                      height={960}
                      className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="p-4 text-sm font-medium text-white">
                        {section.title[lang]}
                      </span>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          {active !== null && (
            <div className="relative">
              <img
                src={active}
                alt=""
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
