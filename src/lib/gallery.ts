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
import salon10 from "@/assets/salon-10.jpg.asset.json";
import salon11 from "@/assets/salon-11.jpg.asset.json";
import salon12 from "@/assets/salon-12.jpg.asset.json";
import salon13 from "@/assets/salon-13.jpg.asset.json";

import cuisine1 from "@/assets/cuisine-1.jpg.asset.json";
import cuisine2 from "@/assets/cuisine-2.jpg.asset.json";
import cuisine3 from "@/assets/cuisine-3.jpg.asset.json";
import cuisine4 from "@/assets/cuisine-4.jpg.asset.json";
import cuisine5 from "@/assets/cuisine-5.jpg.asset.json";
import cuisine6 from "@/assets/cuisine-6.jpg.asset.json";

import exterieur1 from "@/assets/exterieur-1.jpg.asset.json";
import exterieur2 from "@/assets/exterieur-2.jpg.asset.json";
import exterieur3 from "@/assets/exterieur-3.jpg.asset.json";
import exterieur4 from "@/assets/exterieur-4.jpg.asset.json";
import exterieur5 from "@/assets/exterieur-5.jpg.asset.json";
import exterieur6 from "@/assets/exterieur-6.jpg.asset.json";
import exterieur7 from "@/assets/exterieur-7.jpg.asset.json";
import exterieur8 from "@/assets/exterieur-8.jpg.asset.json";
import exterieur9 from "@/assets/exterieur-9.jpg.asset.json";
import exterieur10 from "@/assets/exterieur-10.jpg.asset.json";
import exterieur11 from "@/assets/exterieur-11.jpg.asset.json";
import exterieur12 from "@/assets/exterieur-12.jpg.asset.json";
import exterieur13 from "@/assets/exterieur-13.jpg.asset.json";
import exterieur14 from "@/assets/exterieur-14.jpg.asset.json";
import exterieur15 from "@/assets/exterieur-15.jpg.asset.json";
import exterieur16 from "@/assets/exterieur-16.jpg.asset.json";
import exterieur17 from "@/assets/exterieur-17.jpg.asset.json";
import exterieur18 from "@/assets/exterieur-18.jpg.asset.json";
import exterieur19 from "@/assets/exterieur-19.jpg.asset.json";
import exterieur20 from "@/assets/exterieur-20.jpg.asset.json";
import exterieur21 from "@/assets/exterieur-21.jpg.asset.json";
import exterieur22 from "@/assets/exterieur-22.jpg.asset.json";
import exterieur23 from "@/assets/exterieur-23.jpg.asset.json";

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
  salon10, salon11, salon12, salon13,
];

const cuisineAlt: Record<Lang, string> = {
  fr: "Cuisine entièrement équipée – Résidence Panorama P",
  de: "Voll ausgestattete Küche – Residenz Panorama P",
  en: "Fully equipped kitchen – Panorama P Residence",
};

const cuisineUrls = [cuisine1, cuisine2, cuisine3, cuisine4, cuisine5, cuisine6];

const exterieurAlt: Record<Lang, string> = {
  fr: "Espace extérieur agréable – Résidence Panorama P",
  de: "Angenehmer Außenbereich – Residenz Panorama P",
  en: "Pleasant outdoor space – Panorama P Residence",
};

const exterieurUrls = [
  exterieur1, exterieur2, exterieur3, exterieur4, exterieur5,
  exterieur6, exterieur7, exterieur8, exterieur9, exterieur10,
  exterieur11, exterieur12, exterieur13, exterieur14, exterieur15,
  exterieur16, exterieur17, exterieur18, exterieur19, exterieur20,
  exterieur21, exterieur22, exterieur23,
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
    id: "cuisine",
    title: {
      fr: "Une cuisine entièrement équipée",
      de: "Eine voll ausgestattete Küche",
      en: "A fully equipped kitchen",
    },
    cover: cuisine1.url,
    images: cuisineUrls.map((a) => ({ url: a.url, alt: cuisineAlt })),
  },
  {
    id: "exterieur",
    title: {
      fr: "Des espaces extérieurs agréables",
      de: "Angenehme Außenbereiche",
      en: "Pleasant outdoor spaces",
    },
    cover: exterieur1.url,
    images: exterieurUrls.map((a) => ({ url: a.url, alt: exterieurAlt })),
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
