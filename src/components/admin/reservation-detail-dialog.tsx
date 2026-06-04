import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  Mail,
  CheckCircle2,
  LogIn,
  LogOut,
  CreditCard,
  FileText,
  Receipt,
  MessageCircle,
  CalendarDays,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  opGetReservationDetail,
  opCheckIn,
  opCheckOut,
  opSetReservationStatus,
  opAddPayment,
  opSetReservationTotal,
  opAssignUnit,
} from "@/lib/operations.functions";
import {
  RES_STATUS_LABELS,
  PAY_STATUS_LABELS,
  PAY_METHOD_LABELS,
  canTransition,
} from "@/lib/operations";
import { formatDateFr, formatDateTimeFr, formatMoney } from "@/lib/format";
import { generateReceiptPdf, generateInvoicePdf } from "@/lib/pdf-documents";
import { useResidence } from "@/lib/use-residence";

const OP_KEYS = ["op-dashboard", "admin-reservations", "op-payments", "op-clients", "admin-occupancy", "op-calendar"];

export function ReservationDetailDialog({
  reservationId,
  open,
  onOpenChange,
}: {
  reservationId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const residence = useResidence();
  const runDetail = useServerFn(opGetReservationDetail);
  const runCheckIn = useServerFn(opCheckIn);
  const runCheckOut = useServerFn(opCheckOut);
  const runStatus = useServerFn(opSetReservationStatus);
  const runPay = useServerFn(opAddPayment);
  const runTotal = useServerFn(opSetReservationTotal);

  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("especes");
  const [note, setNote] = useState("");
  const [total, setTotal] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reservation-detail", reservationId],
    queryFn: () => runDetail({ data: { id: reservationId! } }),
    enabled: open && !!reservationId,
    staleTime: 0,
  });

  const invalidateAll = async () => {
    await Promise.all(OP_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));
    await refetch();
  };

  const r = data?.reservation;
  const totals = data?.totals;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      await invalidateAll();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  const addPayment = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Montant invalide");
    await act(
      () => runPay({ data: { reservationId: reservationId!, amount: amt, method: method as any, note: note || undefined } }),
      "Paiement enregistré — reçu envoyé au client.",
    );
    setAmount("");
    setNote("");
  };

  const saveTotal = async () => {
    const t = Number(total);
    if (Number.isNaN(t) || t < 0) return toast.error("Montant invalide");
    await act(() => runTotal({ data: { id: reservationId!, totalAmount: t } }), "Montant total mis à jour.");
    setTotal("");
  };

  const waLink = r ? `https://wa.me/${r.phone.replace(/\D/g, "")}` : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {r ? `${r.name} · ${r.ref}` : "Réservation"}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !r || !totals ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <Badge>{RES_STATUS_LABELS[r.status] ?? r.status}</Badge>
              <Badge variant="outline">{PAY_STATUS_LABELS[r.payment_status] ?? r.payment_status}</Badge>
              {r.unitLabel && <Badge variant="secondary">{r.unitLabel}</Badge>}
            </div>

            {/* Info */}
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formatDateFr(r.arrival_date)} → {formatDateFr(r.departure_date)}
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> {r.guests} personne(s)
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" /> {r.phone}
              </p>
              {r.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {r.email}
                </p>
              )}
              {r.notes && <p className="rounded-lg bg-secondary/60 p-2 text-muted-foreground">{r.notes}</p>}
            </div>

            {/* Money summary */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-card p-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold tabular-nums">{formatMoney(totals.total, residence.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payé</p>
                <p className="font-semibold tabular-nums text-emerald-600">{formatMoney(totals.paid, residence.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Solde</p>
                <p className="font-semibold tabular-nums text-gold">{formatMoney(totals.balance, residence.currency)}</p>
              </div>
            </div>

            {/* Workflow actions */}
            <div className="flex flex-wrap gap-2">
              {r.status === "nouvelle" && (
                <Button size="sm" variant="gold" disabled={busy} onClick={() => act(() => runStatus({ data: { id: r.id, status: "confirmée" } }), "Réservation confirmée.")}>
                  <CheckCircle2 className="h-4 w-4" /> Confirmer
                </Button>
              )}
              {r.status === "confirmée" && (
                <Button size="sm" variant="gold" disabled={busy} onClick={() => act(() => runCheckIn({ data: { id: r.id } }), "Check-in effectué.")}>
                  <LogIn className="h-4 w-4" /> Check-in
                </Button>
              )}
              {r.status === "checkin" && (
                <Button size="sm" variant="gold" disabled={busy} onClick={() => act(() => runCheckOut({ data: { id: r.id } }), "Check-out effectué.")}>
                  <LogOut className="h-4 w-4" /> Check-out
                </Button>
              )}
              {canTransition(r.status, "annulée") && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => runStatus({ data: { id: r.id, status: "annulée" } }), "Réservation annulée.")}>
                  Annuler
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <a href={waLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Contacter
                </a>
              </Button>
            </div>

            {/* Documents */}
            <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  generateInvoicePdf(
                    {
                      reservationId: r.id,
                      clientName: r.name,
                      phone: r.phone,
                      email: r.email,
                      unitLabel: r.unitLabel,
                      arrival: r.arrival_date,
                      departure: r.departure_date,
                      guests: r.guests,
                      nightlyPrice: totals.total && r.arrival_date !== r.departure_date
                        ? Math.round(totals.total / Math.max(1, (Date.parse(r.departure_date) - Date.parse(r.arrival_date)) / 86400000))
                        : totals.total,
                      total: totals.total,
                      paid: totals.paid,
                      balance: totals.balance,
                    },
                    residence,
                  )
                }
              >
                <FileText className="h-4 w-4" /> Facture PDF
              </Button>
              {data.payments.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    generateReceiptPdf(
                      {
                        reservationId: r.id,
                        clientName: r.name,
                        amount: data.payments[0].amount,
                        method: data.payments[0].method,
                        date: data.payments[0].createdAt,
                        balance: totals.balance,
                      },
                      residence,
                    )
                  }
                >
                  <Receipt className="h-4 w-4" /> Reçu PDF
                </Button>
              )}
            </div>

            {/* Add payment */}
            <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/40 p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 text-gold" /> Enregistrer un paiement
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Montant"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAY_METHOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" variant="gold" className="w-full" disabled={busy} onClick={addPayment}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Ajouter le paiement
              </Button>
            </div>

            {/* Total override */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Montant total convenu</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={String(totals.total)}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" disabled={busy} onClick={saveTotal}>
                Enregistrer
              </Button>
            </div>

            {/* Payment history */}
            {data.payments.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Historique des paiements</p>
                {data.payments.map((p: { id: string; amount: number; method: string; createdAt: string }) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm">
                    <span>{formatMoney(p.amount, residence.currency)} · {PAY_METHOD_LABELS[p.method] ?? p.method}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTimeFr(p.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
