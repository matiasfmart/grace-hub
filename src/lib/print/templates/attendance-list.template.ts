/**
 * Template: Lista de Asistencia de Reunión
 *
 * REPORTE 1 — Se imprime ANTES de la reunión para tomar asistencia a mano,
 * o DESPUÉS para tener registro físico de la reunión tomada.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  createPdfDoc,
  drawDocHeader,
  drawTable,
  downloadPdf,
  type PdfTableColumn,
} from "../pdf";
import { generateExcel, type ExcelColumn } from "../excel";

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface AttendanceListAttendee {
  firstName: string;
  lastName: string;
  /** undefined = lista en blanco (para imprimir antes de la reunión) */
  attended?: boolean;
}

export interface AttendanceListData {
  meetingName: string;
  seriesName: string;
  /** YYYY-MM-DD */
  date: string;
  time: string;
  location: string;
  attendees: AttendanceListAttendee[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEEE d 'de' MMMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

function buildFilename(data: AttendanceListData): string {
  const dateTag = data.date.replace(/-/g, "");
  const nameTag = data.meetingName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 30);
  return `gracehub_asistencia_${nameTag}_${dateTag}`;
}

function buildExportDate(): string {
  return format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export function generateAttendanceListPdf(data: AttendanceListData): void {
  const doc = createPdfDoc("portrait");
  const exportDate = buildExportDate();

  const subtitle = [
    formatDate(data.date),
    data.time && `${data.time}hs`,
    data.location && `· ${data.location}`,
  ]
    .filter(Boolean)
    .join("  ");

  const startY = drawDocHeader(doc, {
    title: data.meetingName,
    subtitle: `Serie: ${data.seriesName}  |  ${subtitle}`,
    exportDate,
  });

  const columns: PdfTableColumn[] = [
    { header: "#", dataKey: "num", width: 10 },
    { header: "Apellido", dataKey: "lastName", width: 45 },
    { header: "Nombre", dataKey: "firstName", width: 45 },
    { header: "Presente", dataKey: "presentBox", width: 22 },
    { header: "Ausente", dataKey: "absentBox", width: 22 },
  ];

  const rows = data.attendees.map((a, i) => ({
    num: String(i + 1),
    lastName: a.lastName,
    firstName: a.firstName,
    presentBox:
      a.attended === true ? "✓" : a.attended === undefined ? "□" : "",
    absentBox:
      a.attended === false ? "✓" : a.attended === undefined ? "□" : "",
  }));

  drawTable(doc, startY, columns, rows);

  // Firma al pie
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total esperados: ${data.attendees.length}`,
    14,
    pageH - 28,
  );
  doc.text("Firma del responsable: _________________________", 14, pageH - 20);

  downloadPdf(doc, `${buildFilename(data)}.pdf`);
}

// ─── Excel ───────────────────────────────────────────────────────────────────

export function generateAttendanceListExcel(data: AttendanceListData): void {
  const exportDate = buildExportDate();

  const columns: ExcelColumn[] = [
    { header: "#", key: "num", width: 5 },
    { header: "Apellido", key: "lastName", width: 25 },
    { header: "Nombre", key: "firstName", width: 25 },
    { header: "Presente (1=Sí, 0=No)", key: "attended", width: 22 },
  ];

  const rows = data.attendees.map((a, i) => ({
    num: i + 1,
    lastName: a.lastName,
    firstName: a.firstName,
    attended: a.attended === true ? 1 : a.attended === false ? 0 : "",
  }));

  generateExcel(
    {
      sheetName: "Asistencia",
      title: data.meetingName,
      subtitle: `${formatDate(data.date)} · ${data.seriesName}`,
      exportDate,
    },
    columns,
    rows,
    buildFilename(data),
  );
}
