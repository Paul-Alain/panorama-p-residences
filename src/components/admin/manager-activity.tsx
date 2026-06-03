import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ShieldCheck,
  Clock,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  MessageSquareReply,
  Star,
  EyeOff,
  Info,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { adminGetManagerActivity } from "@/lib/admin.functions";

interface AdminEntry {
  id: string;
  full_name: string | null;
  email: string | null;
  last_sign_in_at: string | null;
}

type FeedKind =
  | "reservation_confirmée"
  | "reservation_terminée"
  | "reservation_annulée"
  | "message_reply"
  | "review_approved"
  | "review_hidden";

interface FeedItem {
  id: string;
  kind: FeedKind;
  name: string;
  at: string;
}

const ICONS: Record<FeedKind, typeof CalendarCheck> = {
  reservation_confirmée: CalendarCheck,
  reservation_terminée: CheckCircle2,
  reservation_annulée: CalendarX,
  message_reply: MessageSquareReply,
  review_approved: Star,
  review_hidden: EyeOff,
};

export function ManagerActivity() {
  const { t, lang } = useLanguage();
  const m = t.admin.dash.manager;
  const run = useServerFn(adminGetManagerActivity);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-manager-activity"],
    queryFn: async () =>
      (await run()) as { admins: AdminEntry[]; feed: FeedItem[] },
  });

  const fmt = (s: string | null) => {
    if (!s) return m.never;
    const dt = new Date(s);
    return Number.isNaN(dt.getTime())
      ? s
      : dt.toLocaleString(lang, {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const initials = (name: string | null, email: string | null) => {
    const base = (name || email || "?").trim();
    return base.slice(0, 2).toUpperCase();
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  const admins = data?.admins ?? [];
  const feed = data?.feed ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold">{m.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{m.subtitle}</p>
      </div>

      {/* Admin roster */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gold" />
          <h3 className="font-medium">{m.team}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                {initials(a.full_name, a.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.full_name || a.email || "—"}</p>
                <p className="truncate text-sm text-muted-foreground">{a.email ?? "—"}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {m.lastSignIn}: {fmt(a.last_sign_in_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity feed */}
      <section className="space-y-3">
        <h3 className="font-medium">{m.feedTitle}</h3>
        <p className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {m.note}
        </p>

        {feed.length === 0 ? (
          <p className="text-muted-foreground">{m.feedEmpty}</p>
        ) : (
          <ol className="relative space-y-3 border-l border-border/60 pl-5">
            {feed.map((item) => {
              const Icon = ICONS[item.kind];
              const label = (m.actions[item.kind] || "").replace("{name}", item.name);
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-gold/15 ring-4 ring-background">
                    <Icon className="h-3 w-3 text-gold" />
                  </span>
                  <div className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{m.byTeam}</span>
                      <span aria-hidden>·</span>
                      <span>{fmt(item.at)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
