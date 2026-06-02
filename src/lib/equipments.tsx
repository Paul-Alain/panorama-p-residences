import {
  Wifi,
  ChefHat,
  ShowerHead,
  Tv,
  Snowflake,
  ShieldCheck,
  Car,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "@/lib/i18n/translations";

interface EquipmentDef {
  icon: LucideIcon;
  labels: Record<Lang, string>;
}

// Keyed by the canonical French value stored in the database.
const equipmentMap: Record<string, EquipmentDef> = {
  "Wi-Fi": { icon: Wifi, labels: { fr: "Wi-Fi", de: "WLAN", en: "Wi-Fi" } },
  Cuisine: {
    icon: ChefHat,
    labels: { fr: "Cuisine", de: "Küche", en: "Kitchen" },
  },
  "Douche moderne": {
    icon: ShowerHead,
    labels: { fr: "Douche moderne", de: "Moderne Dusche", en: "Modern shower" },
  },
  "Télévision": {
    icon: Tv,
    labels: { fr: "Télévision", de: "Fernseher", en: "Television" },
  },
  Climatisation: {
    icon: Snowflake,
    labels: { fr: "Climatisation", de: "Klimaanlage", en: "Air conditioning" },
  },
  "Sécurité": {
    icon: ShieldCheck,
    labels: { fr: "Sécurité", de: "Sicherheit", en: "Security" },
  },
  Parking: {
    icon: Car,
    labels: { fr: "Parking", de: "Parkplatz", en: "Parking" },
  },
};

export function getEquipment(value: string, lang: Lang) {
  const def = equipmentMap[value];
  return {
    icon: def?.icon ?? ShieldCheck,
    label: def?.labels[lang] ?? value,
  };
}
