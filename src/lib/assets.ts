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
};

export { heroResidence };

export function resolveImage(id?: string | null): string {
  if (!id) return heroResidence;
  if (id.startsWith("http") || id.startsWith("/")) return id;
  return assetMap[id] ?? heroResidence;
}

export const galleryImages: { id: string; key: string }[] = [
  { id: "gallery-salon", key: "salon" },
  { id: "logement-chambre", key: "chambre" },
  { id: "gallery-cuisine", key: "cuisine" },
  { id: "gallery-douche", key: "douche" },
  { id: "gallery-vue", key: "vue" },
  { id: "gallery-exterieur", key: "exterieur" },
  { id: "logement-studio", key: "studio" },
  { id: "logement-appartement", key: "appartement" },
];
