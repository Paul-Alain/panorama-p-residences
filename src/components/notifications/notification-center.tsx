import { useMemo, useState } from "react";
import { Bell, CalendarDays, MessageSquare, Star, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  formatRelative,
  useReadState,
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications";

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  reservation: CalendarDays,
  reply: MessageSquare,
  review: Star,
};

export function NotificationCenter({
  scope,
  notifications,
}: {
  scope: string;
  notifications: AppNotification[];
}) {
  const { t, lang } = useLanguage();
  const tn = t.notifications;
  const { isRead, markRead, markAllRead } = useReadState(scope);
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !isRead(n.id)).length,
    [notifications, isRead],
  );

  const allIds = useMemo(() => notifications.map((n) => n.id), [notifications]);

  // Cloche rouge si des réservations sont en attente de validation
  const hasPendingReservations = notifications.some(
    (n) => n.kind === "reservation" && !isRead(n.id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={tn.title}
        >
          <Bell className={`h-4 w-4 ${hasPendingReservations ? "text-red-500" : ""}`} />
          {unreadCount > 0 && (
            <span className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${hasPendingReservations ? "bg-red-500" : "bg-gold"}`}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-semibold">{tn.title}</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
                {unreadCount} {tn.unreadLabel}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => markAllRead(allIds)}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tn.markAllRead}</span>
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {tn.empty}
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <ul className="divide-y divide-border/50">
              {notifications.map((n) => {
                const read = isRead(n.id);
                const Icon = KIND_ICON[n.kind];
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 ${
                        read ? "opacity-70" : "bg-gold/[0.04]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          read ? "bg-secondary" : "bg-gold/15"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${read ? "text-muted-foreground" : "text-gold"}`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {n.title}
                          </span>
                          {!read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {n.body}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground/80">
                          {formatRelative(n.timestamp, lang)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
