// Resolves image identifiers (stored in the database) to bundled assets.
// New photos added later via the admin can use full http(s) URLs, which pass through unchanged.
import heroResidence from "@/assets/hero-residence.jpg";
import logementStudio from "@/assets/logement-studio.jpg";
import logementChambre from "@/assets/logement-chambre.jpg";
import logementAppartement from "@/assets/logement-appartement.jpg";
import gallerySalon from "@/assets/gallery-salon.jpg";
import galleryCuisine from "@/assets/gallery-cuisine.jpg";
import galleryVue from "@/assets/gallery-vue.jpg";
import galleryDouche from "@/assets/gallery-douche.jpg";
import galleryExterieur from "@/assets/gallery-exterieur.jpg";

// Real residence photos hosted on the CDN.
import residenceFacade from "@/assets/residence-facade.jpg.asset.json";
import residenceCote from "@/assets/residence-cote.jpg.asset.json";
import residenceAlleeVue from "@/assets/residence-allee-vue.jpg.asset.json";
import residenceEntree from "@/assets/residence-entree.jpg.asset.json";
import residenceAllee from "@/assets/residence-allee.jpg.asset.json";
import residenceJardin from "@/assets/residence-jardin.jpg.asset.json";
import residenceCouloir from "@/assets/residence-couloir.jpg.asset.json";
import residenceCouloirVue from "@/assets/residence-couloir-vue.jpg.asset.json";
import residencePorte from "@/assets/residence-porte.jpg.asset.json";

const assetMap: Record<string, string> = {
  "hero-residence": heroResidence,
  "logement-studio": logementStudio,
  "logement-chambre": logementChambre,
  "logement-appartement": logementAppartement,
  "gallery-salon": gallerySalon,
  "gallery-cuisine": galleryCuisine,
  "gallery-vue": galleryVue,
  "gallery-douche": galleryDouche,
  "gallery-exterieur": galleryExterieur,
  // Real residence photos
  "residence-facade": residenceFacade.url,
  "residence-cote": residenceCote.url,
  "residence-allee-vue": residenceAlleeVue.url,
  "residence-entree": residenceEntree.url,
  "residence-allee": residenceAllee.url,
  "residence-jardin": residenceJardin.url,
  "residence-couloir": residenceCouloir.url,
  "residence-couloir-vue": residenceCouloirVue.url,
  "residence-porte": residencePorte.url,
};

export { heroResidence };

export function resolveImage(id?: string | null): string {
  if (!id) return heroResidence;
  if (id.startsWith("http") || id.startsWith("/")) return id;
  return assetMap[id] ?? heroResidence;
}

export const galleryImages: { id: string; key: string }[] = [
  { id: "residence-facade", key: "facade" },
  { id: "residence-cote", key: "cote" },
  { id: "residence-allee-vue", key: "vue" },
  { id: "residence-entree", key: "entree" },
  { id: "residence-allee", key: "allee" },
  { id: "residence-jardin", key: "jardin" },
  { id: "residence-couloir", key: "couloir" },
  { id: "residence-couloir-vue", key: "balcon" },
  { id: "residence-porte", key: "chambre" },
];
