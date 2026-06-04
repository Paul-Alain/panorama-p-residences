// Gallery organised in stacked blocks (one section per category).
// Each new batch of photos sent by the manager becomes (or extends) a section.

import type { Lang } from "@/lib/i18n/translations";

import chambre1 from "@/assets/chambre-1.jpg.asset.json";
import chambre2 from "@/assets/chambre-2.jpg.asset.json";
import chambre3 from "@/assets/chambre-3.jpg.asset.json";
import chambre4 from "@/assets/chambre-4.jpg.asset.json";
import chambre5 from "@/assets/chambre-5.jpg.asset.json";
import chambre6 from "@/assets/chambre-6.jpg.asset.json";
import chambre7 from "@/assets/chambre-7.jpg.asset.json";
import chambre8 from "@/assets/chambre-8.jpg.asset.json";

export interface GalleryImage {
  url: string;
  alt: Record<Lang, string>;
}

export interface GallerySection {
  id: string;
  title: Record<Lang, string>;
  images: GalleryImage[];
}

export const gallerySections: GallerySection[] = [
  {
    id: "chambre",
    title: {
      fr: "Des chambres confortables",
      de: "Komfortable Zimmer",
      en: "Comfortable bedrooms",
    },
    images: [
      chambre1, chambre2, chambre3, chambre4,
      chambre5, chambre6, chambre7, chambre8,
    ].map((a) => ({
      url: a.url,
      alt: {
        fr: "Chambre confortable – Résidence Panorama P",
        de: "Komfortables Zimmer – Residenz Panorama P",
        en: "Comfortable bedroom – Panorama P Residence",
      },
    })),
  },
];
