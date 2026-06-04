// Gallery organised in blocks (one card per category).
// The gallery index shows a card per block; clicking a card opens a
// dedicated page (/galerie/$blockId) presenting all photos of that block.
// Each new batch of photos sent by the manager becomes (or extends) a block.

import type { Lang } from "@/lib/i18n/translations";

import chambre1 from "@/assets/chambre-1.jpg.asset.json";
import chambre2 from "@/assets/chambre-2.jpg.asset.json";
import chambre3 from "@/assets/chambre-3.jpg.asset.json";
import chambre4 from "@/assets/chambre-4.jpg.asset.json";
import chambre5 from "@/assets/chambre-5.jpg.asset.json";
import chambre6 from "@/assets/chambre-6.jpg.asset.json";
import chambre7 from "@/assets/chambre-7.jpg.asset.json";
import chambre8 from "@/assets/chambre-8.jpg.asset.json";
import chambre9 from "@/assets/chambre-9.jpg.asset.json";
import chambre10 from "@/assets/chambre-10.jpg.asset.json";
import chambre11 from "@/assets/chambre-11.jpg.asset.json";

import salon1 from "@/assets/salon-1.jpg.asset.json";
import salon2 from "@/assets/salon-2.jpg.asset.json";
import salon3 from "@/assets/salon-3.jpg.asset.json";
import salon4 from "@/assets/salon-4.jpg.asset.json";
import salon5 from "@/assets/salon-5.jpg.asset.json";
import salon6 from "@/assets/salon-6.jpg.asset.json";
import salon7 from "@/assets/salon-7.jpg.asset.json";
import salon8 from "@/assets/salon-8.jpg.asset.json";
import salon9 from "@/assets/salon-9.jpg.asset.json";

export interface GalleryImage {
  url: string;
  alt: Record<Lang, string>;
}

export interface GallerySection {
  id: string;
  title: Record<Lang, string>;
  cover: string;
  images: GalleryImage[];
}

const chambreAlt: Record<Lang, string> = {
  fr: "Chambre confortable – Résidence Panorama P",
  de: "Komfortables Zimmer – Residenz Panorama P",
  en: "Comfortable bedroom – Panorama P Residence",
};

const chambreUrls = [
  chambre1, chambre2, chambre3, chambre4, chambre5, chambre6,
  chambre7, chambre8, chambre9, chambre10, chambre11,
];

const salonAlt: Record<Lang, string> = {
  fr: "Salon accueillant – Résidence Panorama P",
  de: "Einladendes Wohnzimmer – Residenz Panorama P",
  en: "Welcoming living room – Panorama P Residence",
};

const salonUrls = [
  salon1, salon2, salon3, salon4, salon5, salon6, salon7, salon8, salon9,
];

export const gallerySections: GallerySection[] = [
  {
    id: "salon",
    title: {
      fr: "Un salon accueillant",
      de: "Ein einladendes Wohnzimmer",
      en: "A welcoming living room",
    },
    cover: salon1.url,
    images: salonUrls.map((a) => ({ url: a.url, alt: salonAlt })),
  },
  {
    id: "chambre",
    title: {
      fr: "Des chambres confortables",
      de: "Komfortable Zimmer",
      en: "Comfortable bedrooms",
    },
    cover: chambre2.url,
    images: chambreUrls.map((a) => ({ url: a.url, alt: chambreAlt })),
  },
];

export function getGallerySection(id: string): GallerySection | undefined {
  return gallerySections.find((s) => s.id === id);
}
