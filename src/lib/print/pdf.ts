/**
 * PDF wrapper base para GraceHub.
 *
 * Encapsula la configuración común de jsPDF + autotable:
 * - Fuente, márgenes, colores de marca, header/footer estándar.
 * - Las funciones de más alto nivel (templates) importan desde aquí.
 *
 * REGLA: este archivo NO usa React, NO hace fetch(), NO usa hooks.
 * Recibe datos y devuelve/descarga el PDF directamente.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Constantes de diseño ───────────────────────────────────────────────────

export const PDF_COLORS = {
  primary: [37, 99, 235] as [number, number, number],   // blue-600
  header: [30, 41, 59] as [number, number, number],     // slate-800
  headerText: [255, 255, 255] as [number, number, number],
  alternateRow: [248, 250, 252] as [number, number, number], // slate-50
  border: [226, 232, 240] as [number, number, number],  // slate-200
  bodyText: [51, 65, 85] as [number, number, number],   // slate-700
  mutedText: [148, 163, 184] as [number, number, number], // slate-400
} as const;

export const PDF_MARGINS = { top: 28, right: 14, bottom: 20, left: 14 } as const;

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface PdfTableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PdfDocConfig {
  orientation?: "portrait" | "landscape";
  title: string;
  subtitle?: string;
  filterTags?: string[];
  exportDate: string;
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

/** Crea una instancia jsPDF con config estándar del proyecto. */
export function createPdfDoc(
  orientation: "portrait" | "landscape" = "portrait",
): jsPDF {
  return new jsPDF({ orientation, unit: "mm", format: "a4" });
}

/**
 * Dibuja el header estándar (título, subtítulo, filtros, fecha de emisión).
 * Retorna la coordenada Y donde termina el header (para comenzar la tabla).
 */
export function drawDocHeader(doc: jsPDF, config: PdfDocConfig): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Banda de color superior
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 10, "F");

  // Texto "GraceHub" sobre la banda
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.headerText);
  doc.text("GraceHub", PDF_MARGINS.left, 7);

  y = 18;

  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.header);
  doc.text(config.title, PDF_MARGINS.left, y);
  y += 7;

  // Subtítulo
  if (config.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.bodyText);
    doc.text(config.subtitle, PDF_MARGINS.left, y);
    y += 6;
  }

  // Filtros activos como tags
  if (config.filterTags && config.filterTags.length > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`Filtros: ${config.filterTags.join(" · ")}`, PDF_MARGINS.left, y);
    y += 5;
  }

  // Fecha de emisión (derecha)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.mutedText);
  doc.text(
    `Emitido: ${config.exportDate}`,
    pageWidth - PDF_MARGINS.right,
    18,
    { align: "right" },
  );

  // Línea separadora
  y += 2;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGINS.left, y, pageWidth - PDF_MARGINS.right, y);
  y += 4;

  return y;
}

/**
 * Dibuja una tabla estándar usando autotable.
 * Retorna la coordenada Y final (útil para añadir contenido después).
 */
export function drawTable(
  doc: jsPDF,
  startY: number,
  columns: PdfTableColumn[],
  rows: Record<string, string | number>[],
  opts?: { landscape?: boolean },
): number {
  autoTable(doc, {
    startY,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => row[c.dataKey] ?? "")),
    margin: {
      left: PDF_MARGINS.left,
      right: PDF_MARGINS.right,
      bottom: PDF_MARGINS.bottom,
    },
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: PDF_COLORS.bodyText,
      lineColor: PDF_COLORS.border,
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: PDF_COLORS.header,
      textColor: PDF_COLORS.headerText,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.alternateRow,
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, c.width ? { cellWidth: c.width } : {}]),
    ),
    didDrawPage: (data) => {
      // Footer con número de página
      const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.mutedText);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        pageH - 6,
        { align: "center" },
      );
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  return finalY;
}

/**
 * Agrega un bloque de texto de resumen después de la tabla (ej: "Total: 42 miembros").
 */
export function drawSummary(
  doc: jsPDF,
  afterY: number,
  lines: Array<{ label: string; value: string }>,
): void {
  let y = afterY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.header);
  for (const line of lines) {
    doc.text(`${line.label}: `, PDF_MARGINS.left, y);
    const labelWidth = doc.getTextWidth(`${line.label}: `);
    doc.setFont("helvetica", "normal");
    doc.text(line.value, PDF_MARGINS.left + labelWidth, y);
    doc.setFont("helvetica", "bold");
    y += 6;
  }
}

/** Dispara la descarga del PDF en el browser. */
export function downloadPdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}
