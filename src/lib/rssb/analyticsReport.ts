import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CounterHeader } from './types';

export interface AnalyticsReportData {
  total: number;
  verified: number;
  pending: number;
  fraudFlagged: number;
  totalOriginal: number;
  totalDeducted: number;
  totalApproved: number;
  verificationRate: number;
  deductionRate: number;
  avgVoucher: number;
  actAmounts: Array<{ name: string; total: number }>;
  patientsByAffiliate: Array<{ name: string; count: number; total: number }>;
  topPatients: Array<{ name: string; count: number; total: number }>;
}

/** Draws a simple horizontal bar chart directly on the PDF canvas (vector, no screenshotting needed). */
function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  rows: Array<{ label: string; value: number }>,
  color: [number, number, number] = [15, 118, 110],
  valueFormatter: (v: number) => string = v => v.toLocaleString(),
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(title, x, y);
  y += 6;

  const max = Math.max(1, ...rows.map(r => r.value));
  const barHeight = 5;
  const gap = 3;
  const labelWidth = 46;
  const barAreaWidth = width - labelWidth - 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rows.forEach(row => {
    const barW = Math.max(1, (row.value / max) * barAreaWidth);
    doc.setTextColor(60, 60, 60);
    const label = row.label.length > 26 ? row.label.slice(0, 24) + '…' : row.label;
    doc.text(label, x, y + barHeight - 1.2);

    doc.setFillColor(...color);
    doc.roundedRect(x + labelWidth, y, barW, barHeight, 0.6, 0.6, 'F');

    doc.setTextColor(30, 30, 30);
    doc.text(valueFormatter(row.value), x + labelWidth + barW + 2, y + barHeight - 1.2);

    y += barHeight + gap;
  });

  return y;
}

function fmtRWF(v: number) {
  return `RWF ${Math.round(v).toLocaleString()}`;
}

/**
 * Builds a multi-page PDF summarizing medical claims analytics: KPI cards, top
 * facilities/doctors/patients (as vector bar charts), classification
 * breakdown, and the session notes captured for this medical session.
 */
export function buildAnalyticsPdf(
  data: AnalyticsReportData,
  opts: { pharmacyName?: string; fileName?: string; header?: CounterHeader | null; sessionNotes?: string },
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // ---- Header ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('Medical Claims Analytics Report', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const pharmacyLine = [
    opts.pharmacyName || opts.header?.pharmacyName || 'Unnamed facility',
    opts.header?.period ? `Period: ${opts.header.period}` : null,
    opts.header?.code ? `Code: ${opts.header.code}` : null,
  ].filter(Boolean).join('   ·   ');
  doc.text(pharmacyLine, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(`Generated ${new Date().toLocaleString()}${opts.fileName ? `  ·  Source file: ${opts.fileName}` : ''}`, margin, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ---- KPI summary table ----
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.4 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    head: [['Metric', 'Value']],
    body: [
      ['Total vouchers', data.total.toLocaleString()],
      ['Verified', `${data.verified.toLocaleString()} (${data.verificationRate.toFixed(1)}%)`],
      ['Pending', data.pending.toLocaleString()],
      ['Fraud flagged', data.fraudFlagged.toLocaleString()],
      ['Total claimed amount', fmtRWF(data.totalOriginal)],
      ['Total deducted', `${fmtRWF(data.totalDeducted)} (${data.deductionRate.toFixed(1)}%)`],
      ['Total approved', fmtRWF(data.totalApproved)],
      ['Average per voucher', fmtRWF(data.avgVoucher)],
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ---- Amounts billed by act ----
  if (data.actAmounts.length) {
    if (y > 240) { doc.addPage(); y = margin; }
    y = drawBarChart(
      doc, margin, y, pageWidth - margin * 2,
      'Amounts billed by act',
      data.actAmounts.slice(0, 8).map(a => ({ label: a.name, value: a.total })),
      [15, 118, 110], fmtRWF,
    );
    y += 6;
  }

  // ---- Patients by affiliate ----
  if (data.patientsByAffiliate.length) {
    if (y > 240) { doc.addPage(); y = margin; }
    y = drawBarChart(
      doc, margin, y, pageWidth - margin * 2,
      "Patients by affiliate's affectation",
      data.patientsByAffiliate.slice(0, 8).map(a => ({ label: a.name, value: a.count })),
      [201, 154, 46], v => v.toLocaleString(),
    );
    y += 6;
  }

  // ---- Top patients ----
  if (data.topPatients.length) {
    if (y > 220) { doc.addPage(); y = margin; }
    y = drawBarChart(
      doc, margin, y, pageWidth - margin * 2,
      'Top patients by amount billed',
      data.topPatients.slice(0, 8).map(p => ({ label: p.name, value: p.total })),
      [124, 58, 237], fmtRWF,
    );
    y += 6;
  }

  // ---- Session notes ----
  const notes = (opts.sessionNotes || '').trim();
  if (y > 250) { doc.addPage(); y = margin; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Session notes', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  const noteLines = doc.splitTextToSize(notes || 'No session notes were recorded for this medical session.', pageWidth - margin * 2);
  doc.text(noteLines, margin, y);

  // ---- Footer page numbers ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    doc.text('RSSB Counter Verification System', margin, doc.internal.pageSize.getHeight() - 8);
  }

  return doc;
}
