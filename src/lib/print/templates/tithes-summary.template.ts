/**
 * Template: Resumen de Diezmos
 *
 * REPORTE 6 — Tabla pivote miembro × mes con indicador pagó/no pagó.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  createPdfDoc,
  drawDocHeader,
  downloadPdf,
  PDF_COLORS,
  PDF_MARGINS,
} from "../pdf";

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface TithesSummaryMonth {
  year: number;
  month: number; // 1-12
  /** Ej: "Ene 2026" */
  label: string;
}

export interface TithesSummaryRow {
  memberName: string;
  /** "YYYY-MM" → pagó */
  titheByMonth: Record<string, boolean>;
  totalMonths: number;
  totalPaid: number;
}

export interface TithesSummaryData {
  title: string;
  /** Ej: "Enero 2026 — Junio 2026" */
  periodLabel: string;
  exportDate: string;
  months: TithesSummaryMonth[];
  rows: TithesSummaryRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildFilename(): string {
  const dateTag = format(new Date(), "yyyyMMdd");
  return `gracehub_diezmos_${dateTag}`;
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export function generateTithesSummaryPdf(data: TithesSummaryData): void {
  const doc = createPdfDoc("landscape");

  const startY = drawDocHeader(doc, {
    title: data.title,
    subtitle: `Período: ${data.periodLabel}`,
    exportDate: data.exportDate,
  });

  const monthHeaders = data.months.map((m) => m.label);
  const head = [["Miembro", ...monthHeaders, "Pagó", "Meses"]];

  const body = data.rows.map((row) => {
    const monthCells = data.months.map((m) =>
      row.titheByMonth[monthKey(m.year, m.month)] ? "✓" : "✗",
    );
    return [
      row.memberName,
      ...monthCells,
      String(row.totalPaid),
      String(row.totalMonths),
    ];
  });

  // Anchos
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;
  const fixedWidth = 55 + 14 + 14;
  const monthColWidth = Math.max(
    11,
    Math.floor((usableWidth - fixedWidth) / Math.max(data.months.length, 1)),
  );

  const columnStyles: Record<number, { cellWidth: number; halign?: "center" | "left" }> = {
    0: { cellWidth: 55 },
  };
  for (let i = 1; i <= data.months.length; i++) {
    columnStyles[i] = { cellWidth: monthColWidth, halign: "center" };
  }
  columnStyles[data.months.length + 1] = { cellWidth: 14, halign: "center" };
  columnStyles[data.months.length + 2] = { cellWidth: 14, halign: "center" };

  autoTable(doc, {
    startY,
    head,
    body,
    margin: { left: PDF_MARGINS.left, right: PDF_MARGINS.right, bottom: PDF_MARGINS.bottom },
    styles: {
      fontSize: 8,
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      textColor: PDF_COLORS.bodyText,
      lineColor: PDF_COLORS.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: PDF_COLORS.header,
      textColor: PDF_COLORS.headerText,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: { fillColor: PDF_COLORS.alternateRow },
    columnStyles,
    didDrawPage: (hookData) => {
      const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.mutedText);
      doc.text(
        `Página ${hookData.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        pageH - 6,
        { align: "center" },
      );
    },
  });

  downloadPdf(doc, `${buildFilename()}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function generateTithesSummaryExcel(data: TithesSummaryData): void {
  const wb = XLSX.utils.book_new();

  const aoa: (string | number)[][] = [];
  aoa.push([data.title]);
  aoa.push([`Período: ${data.periodLabel}`]);
  aoa.push([`Emitido: ${data.exportDate}`]);
  aoa.push([]);

  const headerRow: string[] = [
    "Miembro",
    ...data.months.map((m) => m.label),
    "Pagó",
    "Meses",
  ];
  aoa.push(headerRow);

  for (const row of data.rows) {
    const monthCells = data.months.map((m) =>
      row.titheByMonth[monthKey(m.year, m.month)] ? 1 : 0,
    );
    aoa.push([row.memberName, ...monthCells, row.totalPaid, row.totalMonths]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 30 },
    ...data.months.map(() => ({ wch: 9 })),
    { wch: 8 },
    { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Diezmos");
  XLSX.writeFile(wb, `${buildFilename()}.xlsx`);
}
