/**
 * Template: Historial de Asistencia de un Grupo
 *
 * REPORTE 5 — Tabla pivote miembro × reunión con % de asistencia.
 * Se genera en landscape porque puede tener muchas columnas.
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
import { type ExcelColumn } from "../excel";

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface AttendanceHistoryMeeting {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  name: string;
}

export interface AttendanceHistoryRow {
  memberName: string;
  /** meetingId → attended | null (null = no registrado) */
  attendanceByMeeting: Record<string, boolean | null>;
  totalPresent: number;
  totalExpected: number;
  pct: number;
}

export interface AttendanceHistoryData {
  groupName: string;
  groupType: "GDI" | "Área Ministerial";
  /** YYYY-MM-DD */
  periodFrom?: string;
  /** YYYY-MM-DD */
  periodTo?: string;
  exportDate: string;
  meetings: AttendanceHistoryMeeting[];
  rows: AttendanceHistoryRow[];
  groupAvgPct: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "dd/MM/yy");
  } catch {
    return dateStr;
  }
}

function attendanceSymbol(value: boolean | null | undefined): string {
  if (value === true) return "✓";
  if (value === false) return "✗";
  return "—";
}

function buildFilename(data: AttendanceHistoryData): string {
  const typeTag = data.groupType === "GDI" ? "gdi" : "area";
  const nameTag = data.groupName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 20);
  const dateTag = format(new Date(), "yyyyMMdd");
  return `gracehub_historial_asistencia_${typeTag}_${nameTag}_${dateTag}`;
}

function buildPeriodLabel(data: AttendanceHistoryData): string {
  if (data.periodFrom && data.periodTo) {
    return `${formatShortDate(data.periodFrom)} — ${formatShortDate(data.periodTo)}`;
  }
  if (data.meetings.length > 0) {
    const sorted = [...data.meetings].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return `${formatShortDate(sorted[0].date)} — ${formatShortDate(sorted[sorted.length - 1].date)}`;
  }
  return "";
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export function generateAttendanceHistoryPdf(
  data: AttendanceHistoryData,
): void {
  const doc = createPdfDoc("landscape");

  const subtitle = [
    `${data.groupType}: ${data.groupName}`,
    buildPeriodLabel(data),
  ]
    .filter(Boolean)
    .join("  ·  ");

  const startY = drawDocHeader(doc, {
    title: "Historial de Asistencia",
    subtitle,
    exportDate: data.exportDate,
  });

  // Columnas dinámicas: Miembro | fecha1 | fecha2 | ... | Asistió | Total | %
  const meetingHeaders = data.meetings.map((m) => formatShortDate(m.date));

  const head = [
    ["Miembro", ...meetingHeaders, "Asistió", "Esperado", "%"],
  ];

  const body = data.rows.map((row) => {
    const meetingCells = data.meetings.map((m) =>
      attendanceSymbol(row.attendanceByMeeting[m.id]),
    );
    return [
      row.memberName,
      ...meetingCells,
      String(row.totalPresent),
      String(row.totalExpected),
      `${row.pct}%`,
    ];
  });

  // Fila de promedio del grupo
  body.push([
    "PROMEDIO DEL GRUPO",
    ...data.meetings.map(() => ""),
    "",
    "",
    `${data.groupAvgPct}%`,
  ]);

  // Calcular anchos: fijo para miembro y estadísticas, mínimo para reuniones
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;
  const fixedCols = 4; // Miembro + Asistió + Esperado + %
  const fixedWidth = 55 + 16 + 16 + 14; // aprox
  const meetingColWidth = Math.max(
    12,
    Math.floor((usableWidth - fixedWidth) / Math.max(data.meetings.length, 1)),
  );

  const columnStyles: Record<number, { cellWidth: number; halign?: "center" | "left" | "right" }> = {
    0: { cellWidth: 55 },
  };
  for (let i = 1; i <= data.meetings.length; i++) {
    columnStyles[i] = { cellWidth: meetingColWidth, halign: "center" };
  }
  columnStyles[data.meetings.length + 1] = { cellWidth: 16, halign: "center" };
  columnStyles[data.meetings.length + 2] = { cellWidth: 16, halign: "center" };
  columnStyles[data.meetings.length + 3] = { cellWidth: 14, halign: "center" };

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
    // Última fila (promedio) en negrita
    didParseCell: (data) => {
      if (data.row.index === body.length - 1 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
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

  downloadPdf(doc, `${buildFilename(data)}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function generateAttendanceHistoryExcel(
  data: AttendanceHistoryData,
): void {
  const wb = XLSX.utils.book_new();

  // Metadatos
  const aoa: (string | number)[][] = [];
  aoa.push(["Historial de Asistencia"]);
  aoa.push([`${data.groupType}: ${data.groupName}`]);
  aoa.push([`Período: ${buildPeriodLabel(data)}`]);
  aoa.push([`Emitido: ${data.exportDate}`]);
  aoa.push([]);

  // Header de columnas: Miembro | fecha1 | ... | Asistió | Esperado | %
  const headerRow: string[] = [
    "Miembro",
    ...data.meetings.map((m) => formatShortDate(m.date)),
    "Asistió",
    "Esperado",
    "%",
  ];
  aoa.push(headerRow);

  // Filas de datos
  for (const row of data.rows) {
    const meetingCells = data.meetings.map((m) => {
      const v = row.attendanceByMeeting[m.id];
      if (v === true) return 1;
      if (v === false) return 0;
      return "";
    });
    aoa.push([row.memberName, ...meetingCells, row.totalPresent, row.totalExpected, row.pct]);
  }

  // Fila de promedio
  aoa.push(["PROMEDIO DEL GRUPO", ...data.meetings.map(() => ""), "", "", data.groupAvgPct]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Anchos de columna
  const colWidths = [
    { wch: 30 },
    ...data.meetings.map(() => ({ wch: 10 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Historial");
  XLSX.writeFile(wb, `${buildFilename(data)}.xlsx`);
}
