// Resolves image identifiers (stored in the database) to bundled assets.
// New photos added later via the admin can use full http(s) URLs, which pass through unchanged.

// Real residence photos hosted on the CDN — exterior.
import residenceFacade from "@/assets/residence-facade.jpg.asset.json";
import residenceCote from "@/assets/residence-cote.jpg.asset.json";
import residenceAlleeVue from "@/assets/residence-allee-vue.jpg.asset.json";
import residenceEntree from "@/assets/residence-entree.jpg.asset.json";
import residenceAllee from "@/assets/residence-allee.jpg.asset.json";
import residenceJardin from "@/assets/residence-jardin.jpg.asset.json";
import residenceCouloir from "@/assets/residence-couloir.jpg.asset.json";
import residenceCouloirVue from "@/assets/residence-couloir-vue.jpg.asset.json";
import residencePorte from "@/assets/residence-porte.jpg.asset.json";

// Real residence photos hosted on the CDN — interior.
import intChambreOrange from "@/assets/int-chambre-orange.jpg.asset.json";
import intSalonRotin from "@/assets/int-salon-rotin.jpg.asset.json";
import intSalonCuisine from "@/assets/int-salon-cuisine.jpg.asset.json";
import intSalonLed from "@/assets/int-salon-led.jpg.asset.json";
import intCouloirTv from "@/assets/int-couloir-tv.jpg.asset.json";
import intChambreBleue from "@/assets/int-chambre-bleue.jpg.asset.json";
import intDoucheBeige from "@/assets/int-douche-beige.jpg.asset.json";
import intSalonCouloir from "@/assets/int-salon-couloir.jpg.asset.json";
import intDoucheBleue from "@/assets/int-douche-bleue.jpg.asset.json";
import studioConfort from "@/assets/studio-confort.jpg.asset.json";
import appartementConfort from "@/assets/appartement-confort.jpg.asset.json";

const assetMap: Record<string, string> = {
  // Exterior
  "residence-facade": residenceFacade.url,
  "residence-cote": residenceCote.url,
  "residence-allee-vue": residenceAlleeVue.url,
  "residence-entree": residenceEntree.url,
  "residence-allee": residenceAllee.url,
  "residence-jardin": residenceJardin.url,
  "residence-couloir": residenceCouloir.url,
  "residence-couloir-vue": residenceCouloirVue.url,
  "residence-porte": residencePorte.url,
  // Interior
  "int-chambre-orange": intChambreOrange.url,
  "int-salon-rotin": intSalonRotin.url,
  "int-salon-cuisine": intSalonCuisine.url,
  "int-salon-led": intSalonLed.url,
  "int-couloir-tv": intCouloirTv.url,
  "int-chambre-bleue": intChambreBleue.url,
  "int-douche-beige": intDoucheBeige.url,
  "int-salon-couloir": intSalonCouloir.url,
  "int-douche-bleue": intDoucheBleue.url,
};

const fallback = residenceFacade.url;

export function resolveImage(id?: string | null): string {
  if (!id) return fallback;
  if (id.startsWith("http") || id.startsWith("/")) return id;
  return assetMap[id] ?? fallback;
}

// Curated order for the best full-screen gallery presentation:
// large featured items (index 0, 5, 10) alternate exterior & interior highlights.
export const galleryImages: { id: string; key: string }[] = [
  { id: "residence-facade", key: "facade" },
  { id: "int-salon-rotin", key: "salon" },
  { id: "int-chambre-orange", key: "chambre" },
  { id: "residence-jardin", key: "jardin" },
  { id: "int-salon-led", key: "salonLed" },
  { id: "int-couloir-tv", key: "couloir" },
  { id: "int-chambre-bleue", key: "chambreBleue" },
  { id: "int-douche-beige", key: "salleDeBain" },
  { id: "residence-allee-vue", key: "vue" },
  { id: "int-salon-couloir", key: "salonCuisine" },
  { id: "int-douche-bleue", key: "douche" },
  { id: "residence-cote", key: "cote" },
];
