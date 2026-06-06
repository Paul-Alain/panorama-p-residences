/**
 * Utilitaires de temps — Yaoundé / Bafoussam (UTC+1)
 */

const CAM_OFFSET_MS = 1 * 60 * 60 * 1000;

export function nowCam(): number {
  return Date.now() + CAM_OFFSET_MS - new Date().getTimezoneOffset() * 60_000;
}

export function todayCam(): string {
  return new Date(Date.now() + CAM_OFFSET_MS).toISOString().slice(0, 10);
}

export function dateTimeMsCam(date: string, time: string | null | undefined, fallback = "00:00"): number {
  const t = (time ?? fallback).slice(0, 5);
  return new Date(`${date}T${t}:00+01:00`).getTime();
}

export function isDeparturePassed(departureDate: string, departureTime?: string | null): boolean {
  return dateTimeMsCam(departureDate, departureTime, "11:00") <= nowCam();
}

export function isArrivalPast(arrivalDate: string, arrivalTime?: string | null): boolean {
  return dateTimeMsCam(arrivalDate, arrivalTime, "14:00") < nowCam() - 60_000;
}
