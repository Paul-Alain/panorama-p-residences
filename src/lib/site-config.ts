// Central configuration — easy to edit later (contact details, social links, map).
export const siteConfig = {
  name: "Panorama P",
  // Numéro WhatsApp au format international, sans espaces ni "+" pour le lien wa.me
  whatsappNumber: "237600000000",
  phoneDisplay: "+237 6 00 00 00 00",
  email: "contact@panoramap.cm",
  address: "Quartier résidentiel, Bafoussam, Cameroun",
  // Carte Google Maps centrée sur Bafoussam (modifiable)
  mapEmbedUrl:
    "https://www.google.com/maps?q=Bafoussam,Cameroun&z=13&output=embed",
  mapLink: "https://www.google.com/maps/search/?api=1&query=Bafoussam,Cameroun",
  social: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    whatsapp: "https://wa.me/237600000000",
  },
} as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${siteConfig.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
