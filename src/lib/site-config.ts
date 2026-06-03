// Central configuration — easy to edit later (contact details, social links, map).
export const siteConfig = {
  name: "Panorama P",
  // Numéro WhatsApp au format international, sans espaces ni "+" pour le lien wa.me
  whatsappNumber: "237655862405",
  phoneDisplay: "+237 655 862 405 / +237 677 831 027",
  email: "Residencespanoramap@gmail.com",
  address:
    "Bafoussam, à 500 m du stade municipal de Bamendzi vers le carrefour Aladji, première entrée à gauche",
  // Carte Google Maps centrée sur le stade municipal de Bamendzi, Bafoussam (modifiable)
  mapEmbedUrl:
    "https://www.google.com/maps?q=Stade+municipal+de+Bamendzi,Bafoussam,Cameroun&z=15&output=embed",
  mapLink:
    "https://www.google.com/maps/search/?api=1&query=Stade+municipal+de+Bamendzi,Bafoussam,Cameroun",
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
