import { useCallback, useEffect, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n/translations";
import { parseMessageMeta } from "@/lib/data";

export type NotificationKind = "reservation" | "reply" | "review";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  timestamp: string; // ISO date string
}

type Tn = Dict["notifications"];

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

/* ---------- input row shapes (subset of DB columns) ---------- */

export interface NotifReservation {
  id: string;
  name?: string | null;
  created_at: string;
}

export interface NotifMessage {
  id: string;
  name?: string | null;
  message: string;
  status: string;
  created_at: string;
}

export interface NotifReview {
  id: string;
  name?: string | null;
  rating: number;
  sort_order: number;
  created_at: string;
}

const byNewest = (a: AppNotification, b: AppNotification) =>
  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

/* ---------- client (user) notifications ---------- */

export function buildClientNotifications(
  t: Tn,
  data: {
    reservations: NotifReservation[];
    messages: NotifMessage[];
    reviews: NotifReview[];
  },
): AppNotification[] {
  const out: AppNotification[] = [];

  for (const r of data.reservations) {
    out.push({
      id: `res-${r.id}`,
      kind: "reservation",
      title: t.client.reservationTitle,
      body: t.client.reservationBody,
      timestamp: r.created_at,
    });
  }

  for (const m of data.messages) {
    const meta = parseMessageMeta(m.message);
    if (meta?.reply) {
      out.push({
        id: `reply-${m.id}`,
        kind: "reply",
        title: t.client.replyTitle,
        body: t.client.replyBody,
        timestamp: meta.repliedAt || m.created_at,
      });
    }
  }

  for (const rev of data.reviews) {
    out.push({
      id: `review-${rev.id}`,
      kind: "review",
      title: t.client.reviewTitle,
      body: t.client.reviewBody,
      timestamp: rev.created_at,
    });
    if (rev.sort_order >= 0) {
      out.push({
        id: `review-approved-${rev.id}`,
        kind: "review",
        title: t.client.reviewApprovedTitle,
        body: t.client.reviewApprovedBody,
        timestamp: rev.created_at,
      });
    }
  }

  return out.sort(byNewest);
}

/* ---------- admin (global) notifications ---------- */

export function buildAdminNotifications(
  t: Tn,
  data: {
    reservations: NotifReservation[];
    messages: NotifMessage[];
    reviews: NotifReview[];
  },
): AppNotification[] {
  const out: AppNotification[] = [];

  for (const r of data.reservations) {
    out.push({
      id: `admin-res-${r.id}`,
      kind: "reservation",
      title: t.admin.reservationTitle,
      body: fill(t.admin.reservationBody, { name: r.name || "—" }),
      timestamp: r.created_at,
    });
  }

  for (const m of data.messages) {
    out.push({
      id: `admin-msg-${m.id}`,
      kind: "reply",
      title: t.admin.messageTitle,
      body: fill(t.admin.messageBody, { name: m.name || "—" }),
      timestamp: m.created_at,
    });
  }

  for (const rev of data.reviews) {
    out.push({
      id: `admin-review-${rev.id}`,
      kind: "review",
      title: t.admin.reviewTitle,
      body: fill(t.admin.reviewBody, { name: rev.name || "—", rating: rev.rating }),
      timestamp: rev.created_at,
    });
  }

  return out.sort(byNewest);
}

/* ---------- read/unread state (frontend-only, localStorage) ---------- */

function storageKey(scope: string) {
  return `pp-notif-read:${scope}`;
}

function loadReadIds(scope: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReadIds(scope: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify([...ids]));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/**
 * Tracks which notifications the user has read. State lives in localStorage so
 * no database schema or RLS change is required. `scope` should be unique per
 * audience (e.g. the user id, or `admin:<id>`).
 */
export function useReadState(scope: string) {
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(scope));

  useEffect(() => {
    setReadIds(loadReadIds(scope));
  }, [scope]);

  const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

  const markRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        saveReadIds(scope, next);
        return next;
      });
    },
    [scope],
  );

  const markAllRead = useCallback(
    (ids: string[]) => {
      setReadIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        saveReadIds(scope, next);
        return next;
      });
    },
    [scope],
  );

  return { isRead, markRead, markAllRead };
}

/* ---------- relative time formatting ---------- */

export function formatRelative(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return rtf.format(Math.round(diffMs / 1000), "second");
  if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  if (abs < 7 * day) return rtf.format(Math.round(diffMs / day), "day");
  return date.toLocaleDateString(lang);
}
