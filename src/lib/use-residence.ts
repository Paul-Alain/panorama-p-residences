import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { opGetSettings } from "@/lib/operations.functions";

export interface ResidenceInfo {
  name: string;
  currency: string;
  checkinTime: string;
  checkoutTime: string;
  depositPercent: number;
}

const FALLBACK: ResidenceInfo = {
  name: "Résidence Panorama P",
  currency: "FCFA",
  checkinTime: "14:00",
  checkoutTime: "11:00",
  depositPercent: 30,
};

/** Shared read of residence settings for currency/name across the dashboard. */
export function useResidence(): ResidenceInfo {
  const runSettings = useServerFn(opGetSettings);
  const { data } = useQuery({
    queryKey: ["op-settings"],
    queryFn: () => runSettings(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  if (!data) return FALLBACK;
  return {
    name: data.name ?? FALLBACK.name,
    currency: data.currency ?? FALLBACK.currency,
    checkinTime: data.checkin_time ?? FALLBACK.checkinTime,
    checkoutTime: data.checkout_time ?? FALLBACK.checkoutTime,
    depositPercent: data.deposit_percent ?? FALLBACK.depositPercent,
  };
}
