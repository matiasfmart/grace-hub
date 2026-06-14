/**
 * Template: Padrón de Grupo (GDI o Área Ministerial)
 *
 * REPORTE 2 (GDI) y REPORTE 3 (Área) — comparten el mismo template.
 * El Guía/Líder y el Mentor se listan aparte de los integrantes.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  createPdfDoc,
  drawDocHeader,
  drawTable,
  drawSummary,
  downloadPdf,
  PDF_MARGINS,
  type PdfTableColumn,
} from "../pdf";
import { generateExcel, type ExcelColumn } from "../excel";

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface GroupRosterMember {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  /** YYYY-MM-DD */
  churchJoinDate?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
  address?: string;
}

export interface GroupRosterData {
  groupName: string;
  groupType: "GDI" | "Área Ministerial";
  /** "Guía" para GDI, "Líder" para Área */
  leaderLabel: string;
  leaderName: string;
  mentorName?: string;
  members: GroupRosterMember[];
  /** fecha de emisión formateada */
  exportDate: string;
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

function buildFilename(data: GroupRosterData): string {
  const typeTag = data.groupType === "GDI" ? "gdi" : "area";
  const nameTag = data.groupName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 25);
  const dateTag = format(new Date(), "yyyyMMdd");
  return `gracehub_padron_${typeTag}_${nameTag}_${dateTag}`;
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export function generateGroupRosterPdf(data: GroupRosterData): void {
  const doc = createPdfDoc("portrait");

  const leaderLine = [
    `${data.leaderLabel}: ${data.leaderName}`,
    data.mentorName ? `Mentor: ${data.mentorName}` : "",
  ]
    .filter(Boolean)
    .join("   ·   ");

  const startY = drawDocHeader(doc, {
    title: `Padrón — ${data.groupType}: ${data.groupName}`,
    subtitle: leaderLine,
    exportDate: data.exportDate,
  });

  const columns: PdfTableColumn[] = [
    { header: "#", dataKey: "num", width: 8 },
    { header: "Apellido", dataKey: "lastName", width: 40 },
    { header: "Nombre", dataKey: "firstName", width: 38 },
    { header: "Teléfono", dataKey: "phone", width: 30 },
    { header: "Ingreso", dataKey: "churchJoinDate", width: 22 },
    { header: "Nacimiento", dataKey: "birthDate", width: 22 },
  ];

  const rows = data.members.map((m, i) => ({
    num: String(i + 1),
    lastName: m.lastName,
    firstName: m.firstName,
    phone: m.phone ?? "",
    churchJoinDate: formatShortDate(m.churchJoinDate),
    birthDate: formatShortDate(m.birthDate),
  }));

  const finalY = drawTable(doc, startY, columns, rows);

  drawSummary(doc, finalY, [
    { label: "Total integrantes", value: String(data.members.length) },
  ]);

  downloadPdf(doc, `${buildFilename(data)}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function generateGroupRosterExcel(data: GroupRosterData): void {
  const columns: ExcelColumn[] = [
    { header: "#", key: "num", width: 5 },
    { header: "Apellido", key: "lastName", width: 25 },
    { header: "Nombre", key: "firstName", width: 25 },
    { header: "Teléfono", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 30 },
    { header: "Fecha de ingreso", key: "churchJoinDate", width: 18 },
    { header: "Fecha de nacimiento", key: "birthDate", width: 20 },
    { header: "Dirección", key: "address", width: 35 },
  ];

  const rows = data.members.map((m, i) => ({
    num: i + 1,
    lastName: m.lastName,
    firstName: m.firstName,
    phone: m.phone ?? "",
    email: m.email ?? "",
    churchJoinDate: formatShortDate(m.churchJoinDate),
    birthDate: formatShortDate(m.birthDate),
    address: m.address ?? "",
  }));

  const leaderLine = [
    `${data.leaderLabel}: ${data.leaderName}`,
    data.mentorName ? `Mentor: ${data.mentorName}` : "",
  ]
    .filter(Boolean)
    .join("  ·  ");

  generateExcel(
    {
      sheetName: data.groupName.slice(0, 31),
      title: `Padrón — ${data.groupType}: ${data.groupName}`,
      subtitle: leaderLine,
      exportDate: data.exportDate,
    },
    columns,
    rows,
    buildFilename(data),
  );
}
