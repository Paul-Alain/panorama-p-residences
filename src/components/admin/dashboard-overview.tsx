import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  Flag,
  Users,
  Mail,
  Star,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatRelative } from "@/lib/notifications";
import {
  adminGetStats,
  adminListReservations,
  adminListMessages,
  adminListReviewsFull,
  adminListUsers,
} from "@/lib/admin.functions";

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

interface ActivityItem {
  id: string;
  kind: "reservation" | "message" | "review" | "account";
  label: string;
  timestamp: string;
}

const ACTIVITY_ICON: Record<ActivityItem["kind"], LucideIcon> = {
  reservation: CalendarCheck,
  message: Mail,
  review: Star,
  account: Users,
};

export function DashboardOverview() {
  const { t, lang } = useLanguage();
  const d = t.admin.dash;

  const runStats = useServerFn(adminGetStats);
  const runReservations = useServerFn(adminListReservations);
  const runMessages = useServerFn(adminListMessages);
  const runReviews = useServerFn(adminListReviewsFull);
  const runUsers = useServerFn(adminListUsers);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => runStats(),
  });
  const { data: reservations = [] } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => runReservations(),
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: () => runMessages(),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => runReviews(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => runUsers(),
  });

  const cards: { icon: LucideIcon; label: string; value: number; accent?: boolean }[] = [
    { icon: CalendarCheck, label: d.cards.totalReservations, value: stats?.totalReservations ?? 0 },
    { icon: Clock, label: d.cards.pendingReservations, value: stats?.pendingReservations ?? 0, accent: true },
    { icon: CheckCircle2, label: d.cards.confirmedReservations, value: stats?.confirmedReservations ?? 0 },
    { icon: Flag, label: d.cards.completedReservations, value: stats?.completedReservations ?? 0 },
    { icon: Users, label: d.cards.totalUsers, value: stats?.totalUsers ?? 0 },
    { icon: Mail, label: d.cards.newMessages, value: stats?.newMessages ?? 0, accent: true },
    { icon: Star, label: d.cards.pendingReviews, value: stats?.pendingReviews ?? 0, accent: true },
  ];

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const r of reservations) {
      items.push({
        id: `res-${r.id}`,
        kind: "reservation",
        label: fill(d.activity.reservation, { name: r.name || "—" }),
        timestamp: r.created_at,
      });
    }
    for (const m of messages) {
      items.push({
        id: `msg-${m.id}`,
        kind: "message",
        label: fill(d.activity.message, { name: m.name || "—" }),
        timestamp: m.created_at,
      });
    }
    for (const rev of reviews) {
      items.push({
        id: `rev-${rev.id}`,
        kind: "review",
        label: fill(d.activity.review, { name: rev.name || "—", rating: rev.rating }),
        timestamp: rev.created_at,
      });
    }
    for (const u of users) {
      items.push({
        id: `usr-${u.id}`,
        kind: "account",
        label: fill(d.activity.account, { name: u.full_name || u.email || "—" }),
        timestamp: u.created_at,
      });
    }
    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  }, [reservations, messages, reviews, users, d]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  c.accent ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground"
                }`}
              >
                <c.icon className="h-4 w-4" />
              </span>
              {statsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">{d.activity.title}</h2>
        <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-soft">
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{d.activity.empty}</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {activity.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{a.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(a.timestamp, lang)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
