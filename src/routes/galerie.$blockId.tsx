import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getGallerySection, type GalleryImage } from "@/lib/gallery";
import { useLanguage } from "@/lib/i18n/language-context";

export const Route = createFileRoute("/galerie/$blockId")({
  loader: ({ params }) => {
    const section = getGallerySection(params.blockId);
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.section.title.fr ?? "Galerie";
    return {
      meta: [
        { title: `${title} – Galerie | Panorama P` },
        {
          name: "description",
          content: `${title} : photos de la résidence Panorama P à Bafoussam.`,
        },
        { property: "og:title", content: `${title} – Panorama P` },
      ],
      links: [{ rel: "canonical", href: `/galerie/${loaderData?.section.id}` }],
    };
  },
  component: GalleryBlockPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Bloc introuvable</h1>
      <Link to="/galerie" className="mt-4 inline-block text-gold underline">
        Retour à la galerie
      </Link>
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Une erreur est survenue</h1>
      <Link to="/galerie" className="mt-4 inline-block text-gold underline">
        Retour à la galerie
      </Link>
    </div>
  ),
});

function GalleryBlockPage() {
  const { section } = Route.useLoaderData();
  const { lang } = useLanguage();
  const [active, setActive] = useState<string | null>(null);

  return (
    <>
      <PageHeader title={section.title[lang]} />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/galerie"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la galerie
          </Link>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {section.images.map((img, i) => (
              <Reveal
                key={`${section.id}-${i}`}
                delay={(i % 3) * 60}
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
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          {active !== null && (
            <div className="relative">
              <img src={active} alt="" className="w-full rounded-xl object-contain" />
              <button
                onClick={() => setActive(null)}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                aria-label="Fermer"
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
