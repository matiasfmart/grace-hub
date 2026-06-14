/**
 * Template: Directorio General de Miembros
 *
 * REPORTE 4 — Exporta la lista de miembros con los filtros activos en pantalla.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  createPdfDoc,
  drawDocHeader,
  drawTable,
  drawSummary,
  downloadPdf,
  type PdfTableColumn,
} from "../pdf";
import { generateExcel, type ExcelColumn } from "../excel";

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface MemberDirectoryEntry {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  gdiName?: string;
  areaNames?: string[];
  roles?: string[];
  status: string;
  /** YYYY-MM-DD */
  churchJoinDate?: string;
  /** YYYY-MM-DD */
  baptismDate?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
}

export interface MemberDirectoryData {
  title: string;
  /** Filtros activos legibles, ej: ["Rol: Guía GDI", "GDI: Alfa"] */
  filters: string[];
  exportDate: string;
  members: MemberDirectoryEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

function buildFilename(): string {
  const dateTag = format(new Date(), "yyyyMMdd");
  return `gracehub_directorio_miembros_${dateTag}`;
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export function generateMemberDirectoryPdf(data: MemberDirectoryData): void {
  const doc = createPdfDoc("landscape");

  const startY = drawDocHeader(doc, {
    title: data.title,
    filterTags: data.filters.length > 0 ? data.filters : undefined,
    exportDate: data.exportDate,
  });

  const columns: PdfTableColumn[] = [
    { header: "#", dataKey: "num", width: 8 },
    { header: "Apellido", dataKey: "lastName", width: 35 },
    { header: "Nombre", dataKey: "firstName", width: 33 },
    { header: "Teléfono", dataKey: "phone", width: 28 },
    { header: "GDI", dataKey: "gdiName", width: 30 },
    { header: "Área(s)", dataKey: "areaNames", width: 35 },
    { header: "Rol(es)", dataKey: "roles", width: 40 },
    { header: "Estado", dataKey: "status", width: 18 },
    { header: "Ingreso", dataKey: "churchJoinDate", width: 20 },
  ];

  const rows = data.members.map((m, i) => ({
    num: String(i + 1),
    lastName: m.lastName,
    firstName: m.firstName,
    phone: m.phone ?? "",
    gdiName: m.gdiName ?? "—",
    areaNames: m.areaNames && m.areaNames.length > 0 ? m.areaNames.join(", ") : "—",
    roles: m.roles && m.roles.length > 0 ? m.roles.join(", ") : "—",
    status: m.status === "vigente" ? "Vigente" : "Eliminado",
    churchJoinDate: formatShortDate(m.churchJoinDate),
  }));

  const finalY = drawTable(doc, startY, columns, rows);

  drawSummary(doc, finalY, [
    { label: "Total en esta vista", value: String(data.members.length) },
  ]);

  downloadPdf(doc, `${buildFilename()}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function generateMemberDirectoryExcel(data: MemberDirectoryData): void {
  const columns: ExcelColumn[] = [
    { header: "#", key: "num", width: 5 },
    { header: "Apellido", key: "lastName", width: 25 },
    { header: "Nombre", key: "firstName", width: 25 },
    { header: "Teléfono", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 32 },
    { header: "GDI", key: "gdiName", width: 25 },
    { header: "Área(s)", key: "areaNames", width: 35 },
    { header: "Rol(es)", key: "roles", width: 35 },
    { header: "Estado", key: "status", width: 12 },
    { header: "Fecha ingreso", key: "churchJoinDate", width: 16 },
    { header: "Bautismo", key: "baptismDate", width: 16 },
    { header: "Nacimiento", key: "birthDate", width: 16 },
  ];

  const rows = data.members.map((m, i) => ({
    num: i + 1,
    lastName: m.lastName,
    firstName: m.firstName,
    phone: m.phone ?? "",
    email: m.email ?? "",
    gdiName: m.gdiName ?? "",
    areaNames: m.areaNames?.join(", ") ?? "",
    roles: m.roles?.join(", ") ?? "",
    status: m.status === "vigente" ? "Vigente" : "Eliminado",
    churchJoinDate: formatShortDate(m.churchJoinDate),
    baptismDate: formatShortDate(m.baptismDate),
    birthDate: formatShortDate(m.birthDate),
  }));

  generateExcel(
    {
      sheetName: "Directorio",
      title: data.title,
      filterTags: data.filters.length > 0 ? data.filters : undefined,
      exportDate: data.exportDate,
    },
    columns,
    rows,
    buildFilename(),
  );
}
