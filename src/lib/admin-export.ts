// Client-side export helpers (PDF / Excel). Heavy libraries are dynamically
// imported so they never enter the SSR bundle and are only loaded on demand.

export interface ExportReservation {
  name: string;
  phone: string;
  email: string | null;
  arrival_date: string;
  departure_date: string;
  guests: number;
  logement_type: string | null;
  status: string;
}

export interface ExportLabels {
  reservationsTitle: string;
  monthlyTitle: string;
  generated: string;
  colName: string;
  colPhone: string;
  colEmail: string;
  colArrival: string;
  colDeparture: string;
  colGuests: string;
  colUnit: string;
  colStatus: string;
  colNights: string;
  colOccupancy: string;
}

const GOLD: [number, number, number] = [201, 168, 76];

function nights(a: string, d: string): number {
  return Math.max(0, Math.round((Date.parse(d) - Date.parse(a)) / 86_400_000));
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function exportReservationsPdf(
  rows: ExportReservation[],
  labels: ExportLabels,
  fmtStatus: (s: string) => string,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text(labels.reservationsTitle, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${labels.generated} ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [[
      labels.colName,
      labels.colPhone,
      labels.colEmail,
      labels.colArrival,
      labels.colDeparture,
      labels.colNights,
      labels.colGuests,
      labels.colUnit,
      labels.colStatus,
    ]],
    body: rows.map((r) => [
      r.name,
      r.phone,
      r.email ?? "—",
      r.arrival_date,
      r.departure_date,
      String(nights(r.arrival_date, r.departure_date)),
      String(r.guests),
      r.logement_type ?? "—",
      fmtStatus(r.status),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: GOLD, textColor: 20 },
    alternateRowStyles: { fillColor: [248, 246, 240] },
  });

  doc.save(`reservations-${stamp()}.pdf`);
}

export async function exportReservationsExcel(
  rows: ExportReservation[],
  labels: ExportLabels,
  fmtStatus: (s: string) => string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => ({
    [labels.colName]: r.name,
    [labels.colPhone]: r.phone,
    [labels.colEmail]: r.email ?? "",
    [labels.colArrival]: r.arrival_date,
    [labels.colDeparture]: r.departure_date,
    [labels.colNights]: nights(r.arrival_date, r.departure_date),
    [labels.colGuests]: r.guests,
    [labels.colUnit]: r.logement_type ?? "",
    [labels.colStatus]: fmtStatus(r.status),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reservations");
  XLSX.writeFile(wb, `reservations-${stamp()}.xlsx`);
}

export interface MonthlyOccupancyRow {
  unit: string;
  occupiedNights: number;
  totalNights: number;
  rate: number;
}

export async function exportMonthlyOccupancyPdf(
  monthLabel: string,
  rows: MonthlyOccupancyRow[],
  overall: number,
  labels: ExportLabels,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(labels.monthlyTitle, 14, 16);
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(monthLabel, 14, 24);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${labels.generated} ${new Date().toLocaleString()}`, 14, 30);
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(`${labels.colOccupancy}: ${overall}%`, 14, 40);

  autoTable(doc, {
    startY: 46,
    head: [[labels.colUnit, labels.colNights, labels.colOccupancy]],
    body: rows.map((r) => [
      r.unit,
      `${r.occupiedNights} / ${r.totalNights}`,
      `${r.rate}%`,
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: GOLD, textColor: 20 },
    alternateRowStyles: { fillColor: [248, 246, 240] },
  });

  doc.save(`occupancy-${stamp()}.pdf`);
}
