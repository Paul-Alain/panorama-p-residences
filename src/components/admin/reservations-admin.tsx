import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, Phone, Mail, Plane, Calendar, FileDown, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  adminListReservations,
  adminUpdateReservationStatus,
} from "@/lib/admin.functions";
import { exportReservationsPdf, exportReservationsExcel } from "@/lib/admin-export";

const PAGE_SIZE = 20;

interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  arrival_date: string;
  departure_date: string;
  guests: number;
  logement_type: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const STATUSES = ["nouvelle", "confirmée", "terminée", "annulée"] as const;
type ResStatus = (typeof STATUSES)[number];

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "confirmée") return "default";
  if (s === "terminée") return "secondary";
  if (s === "annulée") return "destructive";
  return "outline";
}

export function ReservationsAdmin() {
  const { t, lang } = useLanguage();
  const d = t.admin.dash;
  const qc = useQueryClient();
  const runList = useServerFn(adminListReservations);
  const runUpdate = useServerFn(adminUpdateReservationStatus);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: async () => (await runList()) as Reservation[],
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [arrivalFrom, setArrivalFrom] = useState("");
  const [departureTo, setDepartureTo] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fmtStatus = (s: string) =>
    (d.reservationStatus as Record<string, string>)[s] ?? s;
  const fmtDate = (s: string) => {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? s : dt.toLocaleDateString(lang);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (q) {
        const hay = `${r.name} ${r.phone} ${r.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== "all" && r.status !== status) return false;
      if (arrivalFrom && r.arrival_date < arrivalFrom) return false;
      if (departureTo && r.departure_date > departureTo) return false;
      return true;
    });
  }, [data, search, status, arrivalFrom, departureTo]);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingArrivals = useMemo(
    () =>
      [...data]
        .filter((r) => r.arrival_date >= today && r.status !== "annulée")
        .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date))
        .slice(0, 5),
    [data, today],
  );
  const upcomingDepartures = useMemo(
    () =>
      [...data]
        .filter((r) => r.departure_date >= today && r.status !== "annulée")
        .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
        .slice(0, 5),
    [data, today],
  );

  const changeStatus = async (id: string, next: ResStatus) => {
    setSavingId(id);
    try {
      await runUpdate({ data: { id, status: next } });
      await qc.invalidateQueries({ queryKey: ["admin-reservations"] });
      await qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(fmtStatus(next));
    } catch {
      toast.error("Erreur");
    }
    setSavingId(null);
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;
  if (data.length === 0)
    return <p className="text-muted-foreground">{d.reservations.empty}</p>;

  return (
    <div className="space-y-6">
      {(upcomingArrivals.length > 0 || upcomingDepartures.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickList
            icon={<Plane className="h-4 w-4 text-gold" />}
            title={d.reservations.upcomingArrivals}
            items={upcomingArrivals.map((r) => ({
              id: r.id,
              name: r.name,
              date: fmtDate(r.arrival_date),
            }))}
          />
          <QuickList
            icon={<Calendar className="h-4 w-4 text-gold" />}
            title={d.reservations.upcomingDepartures}
            items={upcomingDepartures.map((r) => ({
              id: r.id,
              name: r.name,
              date: fmtDate(r.departure_date),
            }))}
          />
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={d.reservations.search}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{d.reservations.allStatuses}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {fmtStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{d.reservations.arrivalFrom}</label>
          <Input type="date" value={arrivalFrom} onChange={(e) => setArrivalFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{d.reservations.departureTo}</label>
          <Input type="date" value={departureTo} onChange={(e) => setDepartureTo(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">{d.reservations.none}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{r.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </span>
                    {r.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {r.email}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={statusVariant(r.status)}>{fmtStatus(r.status)}</Badge>
              </div>
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">{d.reservations.dates}: </span>
                {fmtDate(r.arrival_date)} → {fmtDate(r.departure_date)} · {r.guests} {d.reservations.guests}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">{d.reservations.accommodation}: </span>
                {r.logement_type ?? "—"}
              </p>
              {r.message && <p className="mt-2 text-sm">{r.message}</p>}
              <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
                <span className="text-xs text-muted-foreground">{d.reservations.setStatus}:</span>
                <Select
                  value={r.status}
                  onValueChange={(v) => changeStatus(r.id, v as ResStatus)}
                >
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {fmtStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {savingId === r.id && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: { id: string; name: string; date: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 font-medium">
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{i.name}</span>
              <span className="shrink-0 text-muted-foreground">{i.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
