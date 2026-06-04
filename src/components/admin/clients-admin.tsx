import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Phone, Mail, User, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { opListClients, opGetClientDetail } from "@/lib/operations.functions";
import { RES_STATUS_LABELS, PAY_STATUS_LABELS, PAY_METHOD_LABELS } from "@/lib/operations";
import { formatDateFr, formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";

export function ClientsAdmin() {
  const residence = useResidence();
  const runList = useServerFn(opListClients);
  const runDetail = useServerFn(opGetClientDetail);
  const [search, setSearch] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["op-clients"],
    queryFn: () => runList(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["op-client-detail", activeKey],
    queryFn: () => runDetail({ data: { key: activeKey! } }),
    enabled: !!activeKey,
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  if (activeKey) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => setActiveKey(null)}>
          <ArrowLeft className="h-4 w-4" /> Retour aux clients
        </Button>
        {detailLoading || !detail ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <h2 className="font-display text-xl font-semibold">{detail.profile.name}</h2>
              <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {detail.profile.phone}</span>
                {detail.profile.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {detail.profile.email}</span>}
              </p>
              <p className="mt-3 text-sm">Total dépensé : <span className="font-semibold text-gold">{formatMoney(detail.totalSpent, residence.currency)}</span></p>
            </div>

            <Section title="Réservations">
              {detail.reservations.length === 0 ? <Empty /> : detail.reservations.map((r) => (
                <Line key={r.id} left={`${r.ref} · ${formatDateFr(r.arrival)} → ${formatDateFr(r.departure)}`} right={
                  <span className="flex gap-1">
                    <Badge variant="outline">{RES_STATUS_LABELS[r.status] ?? r.status}</Badge>
                    <Badge variant="secondary">{PAY_STATUS_LABELS[r.paymentStatus] ?? r.paymentStatus}</Badge>
                  </span>
                } />
              ))}
            </Section>

            <Section title="Paiements">
              {detail.payments.length === 0 ? <Empty /> : detail.payments.map((p) => (
                <Line key={p.id} left={`${formatMoney(p.amount, residence.currency)} · ${PAY_METHOD_LABELS[p.method] ?? p.method}`} right={<span className="text-xs text-muted-foreground">{formatDateFr(p.createdAt)}</span>} />
              ))}
            </Section>

            <Section title="Messages">
              {detail.messages.length === 0 ? <Empty /> : detail.messages.map((m) => (
                <Line key={m.id} left={formatDateFr(m.createdAt)} right={<Badge variant="outline">{m.status}</Badge>} />
              ))}
            </Section>
          </>
        )}
      </div>
    );
  }

  const filtered = data.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${c.name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client" className="pl-9" />
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground">Aucun client.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveKey(c.key)}
              className="rounded-2xl border border-border/60 bg-card p-4 text-left shadow-soft transition hover:border-gold/50"
            >
              <p className="flex items-center gap-2 font-medium">
                <User className="h-4 w-4 text-gold" /> {c.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{c.phone}</p>
              {c.email && <p className="text-sm text-muted-foreground">{c.email}</p>}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{c.reservations} séjour(s)</span>
                <span className="font-semibold text-gold">{formatMoney(c.totalSpent, residence.currency)}</span>
              </div>
              {c.lastStay && <p className="mt-1 text-xs text-muted-foreground">Dernier séjour : {formatDateFr(c.lastStay)}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-base font-semibold">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Line({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2 text-sm">
      <span>{left}</span>
      {right}
    </div>
  );
}
function Empty() {
  return <p className="text-sm text-muted-foreground">—</p>;
}
