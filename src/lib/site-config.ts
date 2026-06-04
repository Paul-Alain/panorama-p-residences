// Central configuration — easy to edit later (contact details, social links, map).
export const siteConfig = {
  name: "Panorama P",
  // Numéro WhatsApp au format international, sans espaces ni "+" pour le lien wa.me
  whatsappNumber: "237655862405",
  phoneDisplay: "+237 655 862 405 / +237 677 831 027",
  email: "Residencespanoramap@gmail.com",
  address:
    "Bafoussam, à 500 m du stade municipal de Bamendzi vers le carrefour Aladji, première entrée à gauche",
  // Coordonnées GPS exactes de la résidence (repère précis sur la carte)
  coordinates: { lat: 5.478280, lng: 10.427312 },
  // Carte Google Maps avec un repère exactement sur la résidence
  mapEmbedUrl:
    "https://www.google.com/maps?q=5.478280,10.427312&z=17&output=embed",
  mapLink:
    "https://www.google.com/maps/search/?api=1&query=5.478280,10.427312",
  social: {
    facebook: "https://www.facebook.com/share/1BuuL3YZz2/",
    instagram: "https://instagram.com",
    whatsapp: "https://wa.me/237655862405",
  },
} as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${siteConfig.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
