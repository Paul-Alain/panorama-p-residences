import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { useLanguage } from "@/lib/i18n/language-context";

export const Route = createFileRoute("/galerie")({
  head: () => ({
    meta: [
      { title: "Galerie – Photos de la résidence | Panorama P" },
      {
        name: "description",
        content:
          "Photos des chambres, salons, cuisine, extérieur et vue panoramique de la résidence Panorama P à Bafoussam.",
      },
      { property: "og:title", content: "Galerie – Panorama P" },
      { property: "og:description", content: "Chambres, salons, cuisine, extérieur et vue panoramique." },
    ],
    links: [{ rel: "canonical", href: "/galerie" }],
  }),
  component: GaleriePage,
});

function GaleriePage() {
  const { t } = useLanguage();
  return (
    <>
      <PageHeader title={t.gallery.title} subtitle={t.gallery.subtitle} />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GalleryGrid />
        </div>
      </section>
    </>
  );
}
