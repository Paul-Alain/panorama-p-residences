import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Coins, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { opListPayments } from "@/lib/operations.functions";
import { PAY_METHOD_LABELS } from "@/lib/operations";
import { formatDateTimeFr, formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";
import { generateReceiptPdf } from "@/lib/pdf-documents";
import { ReservationDetailDialog } from "./reservation-detail-dialog";

export function PaymentsAdmin() {
  const residence = useResidence();
  const runList = useServerFn(opListPayments);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["op-payments"],
    queryFn: () => runList(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  const totalMonth = data
    .filter((p) => p.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-5 shadow-soft">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-gold">
          <Coins className="h-4 w-4" />
        </span>
        <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{formatMoney(totalMonth, residence.currency)}</p>
        <p className="text-xs text-muted-foreground">Total encaissé ce mois — paiements hors plateforme</p>
      </div>

      {data.length === 0 ? (
        <p className="text-muted-foreground">Aucun paiement enregistré.</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border/60 lg:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Réservation</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Méthode</th>
                  <th className="px-3 py-2">Enregistré par</th>
                  <th className="px-3 py-2 text-right">Reçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="px-3 py-2">{formatDateTimeFr(p.createdAt)}</td>
                    <td className="px-3 py-2">
                      <button className="font-mono text-xs hover:text-gold" onClick={() => setDetailId(p.reservationId)}>{p.ref}</button>
                    </td>
                    <td className="px-3 py-2 font-medium">{p.clientName}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(p.amount, residence.currency)}</td>
                    <td className="px-3 py-2">{PAY_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.recordedBy}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => generateReceiptPdf({ reservationId: p.reservationId, clientName: p.clientName, amount: p.amount, method: p.method, date: p.createdAt, balance: 0 }, residence)}>
                        <Receipt className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 lg:hidden">
            {data.map((p) => (
              <div key={p.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{p.clientName}</p>
                    <button className="font-mono text-xs text-muted-foreground hover:text-gold" onClick={() => setDetailId(p.reservationId)}>{p.ref}</button>
                  </div>
                  <p className="font-semibold tabular-nums">{formatMoney(p.amount, residence.currency)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{PAY_METHOD_LABELS[p.method] ?? p.method} · {p.recordedBy}</p>
                <p className="text-xs text-muted-foreground">{formatDateTimeFr(p.createdAt)}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => generateReceiptPdf({ reservationId: p.reservationId, clientName: p.clientName, amount: p.amount, method: p.method, date: p.createdAt, balance: 0 }, residence)}>
                  <Receipt className="h-4 w-4" /> Reçu PDF
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      <ReservationDetailDialog reservationId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} />
    </div>
  );
}
