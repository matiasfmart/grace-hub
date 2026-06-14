/**
 * Excel wrapper base para GraceHub.
 *
 * Encapsula la generación de .xlsx con SheetJS (xlsx).
 * Produce archivos con:
 * - Header de metadatos (título, filtros, fecha)
 * - Tabla de datos con header en negrita
 * - Columnas autoajustadas
 *
 * REGLA: este archivo NO usa React, NO hace fetch(), NO usa hooks.
 */

import * as XLSX from "xlsx";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number; // caracteres
}

export interface ExcelDocConfig {
  sheetName: string;
  title: string;
  subtitle?: string;
  filterTags?: string[];
  exportDate: string;
}

// ─── Builder ────────────────────────────────────────────────────────────────

/**
 * Genera y descarga un archivo Excel.
 *
 * @param config  Metadatos del documento
 * @param columns Definición de columnas
 * @param rows    Filas de datos (array de objetos con las mismas keys que columns)
 * @param filename Nombre del archivo de descarga (sin extensión)
 */
export function generateExcel(
  config: ExcelDocConfig,
  columns: ExcelColumn[],
  rows: Record<string, string | number | boolean>[],
  filename: string,
): void {
  const wb = XLSX.utils.book_new();

  // ── Construir el array de arrays ────────────────────────────────────────

  const aoa: (string | number | boolean)[][] = [];

  // Filas de metadatos
  aoa.push([config.title]);
  if (config.subtitle) aoa.push([config.subtitle]);
  if (config.filterTags && config.filterTags.length > 0) {
    aoa.push([`Filtros: ${config.filterTags.join(" · ")}`]);
  }
  aoa.push([`Emitido: ${config.exportDate}`]);
  aoa.push([]); // fila vacía separadora

  const headerRowIndex = aoa.length; // índice de la fila de headers

  // Fila de headers de columnas
  aoa.push(columns.map((c) => c.header));

  // Filas de datos
  for (const row of rows) {
    aoa.push(columns.map((c) => row[c.key] ?? ""));
  }

  // ── Crear hoja ──────────────────────────────────────────────────────────

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Anchos de columna
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 20 }));

  // Estilos básicos: negrita en la fila de header de columnas
  const headerCells = columns.map((_, i) => ({
    address: XLSX.utils.encode_cell({ r: headerRowIndex, c: i }),
  }));
  for (const { address } of headerCells) {
    if (ws[address]) {
      ws[address].s = { font: { bold: true } };
    }
  }

  // Combinar celdas para el título (primera fila)
  if (columns.length > 1) {
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
    ];
  }

  XLSX.utils.book_append_sheet(wb, ws, config.sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
