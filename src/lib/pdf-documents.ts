// Client-side PDF documents (receipts + invoices). jsPDF is dynamically
// imported so it never enters the SSR bundle.
import { formatDateFr, formatMoney } from "@/lib/format";
import { PAY_METHOD_LABELS, shortRef, nightsBetween } from "@/lib/operations";

const GOLD: [number, number, number] = [201, 168, 76];
const INK: [number, number, number] = [40, 40, 40];

interface ResidenceInfo {
  name: string;
  currency: string;
}

export interface ReceiptData {
  reservationId: string;
  clientName: string;
  amount: number;
  method: string;
  date: string;
  balance: number;
}

export async function generateReceiptPdf(data: ReceiptData, residence: ResidenceInfo): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setTextColor(...GOLD);
  doc.setFontSize(20);
  doc.text(residence.name, 14, 22);
  doc.setTextColor(...INK);
  doc.setFontSize(15);
  doc.text("Reçu de paiement", 14, 34);

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Référence : ${shortRef(data.reservationId)}`, 14, 46);
  doc.text(`Date : ${formatDateFr(data.date)}`, 14, 52);
  doc.text(`Client : ${data.clientName}`, 14, 58);

  doc.setDrawColor(...GOLD);
  doc.line(14, 64, 196, 64);

  doc.setTextColor(...INK);
  doc.setFontSize(12);
  doc.text("Montant reçu", 14, 76);
  doc.setFontSize(18);
  doc.text(formatMoney(data.amount, residence.currency), 14, 86);

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Méthode : ${PAY_METHOD_LABELS[data.method] ?? data.method}`, 14, 98);
  doc.text(`Solde restant : ${formatMoney(data.balance, residence.currency)}`, 14, 106);

  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text("Merci de votre confiance — Résidence Panorama P, Bafoussam.", 14, 280);

  doc.save(`recu-${shortRef(data.reservationId)}.pdf`);
}

export interface InvoiceData {
  reservationId: string;
  clientName: string;
  phone: string;
  email: string | null;
  unitLabel: string | null;
  arrival: string;
  departure: string;
  guests: number;
  nightlyPrice: number;
  total: number;
  paid: number;
  balance: number;
}

export async function generateInvoicePdf(data: InvoiceData, residence: ResidenceInfo): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();

  doc.setTextColor(...GOLD);
  doc.setFontSize(20);
  doc.text(residence.name, 14, 22);
  doc.setTextColor(...INK);
  doc.setFontSize(15);
  doc.text("Facture", 14, 34);

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Facture n° ${shortRef(data.reservationId)}`, 14, 46);
  doc.text(`Émise le ${formatDateFr(new Date())}`, 14, 52);

  doc.text(`Client : ${data.clientName}`, 120, 46);
  doc.text(`Téléphone : ${data.phone}`, 120, 52);
  if (data.email) doc.text(`E-mail : ${data.email}`, 120, 58);

  const nights = nightsBetween(data.arrival, data.departure);
  autoTable(doc, {
    startY: 70,
    head: [["Description", "Quantité", "Prix unitaire", "Montant"]],
    body: [
      [
        `${data.unitLabel ?? "Logement"} — ${formatDateFr(data.arrival)} → ${formatDateFr(data.departure)} (${data.guests} pers.)`,
        `${nights} nuit(s)`,
        formatMoney(data.nightlyPrice, residence.currency),
        formatMoney(nights * data.nightlyPrice, residence.currency),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: GOLD, textColor: 20 },
  });

  // @ts-expect-error lastAutoTable is added by the plugin
  const y = (doc.lastAutoTable?.finalY ?? 90) + 12;
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Total : ${formatMoney(data.total, residence.currency)}`, 130, y);
  doc.text(`Payé : ${formatMoney(data.paid, residence.currency)}`, 130, y + 7);
  doc.setTextColor(...GOLD);
  doc.text(`Solde dû : ${formatMoney(data.balance, residence.currency)}`, 130, y + 14);

  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text("Paiement hors plateforme (espèces, virement, Mobile Money).", 14, 280);

  doc.save(`facture-${shortRef(data.reservationId)}.pdf`);
}
