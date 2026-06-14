/**
 * Re-exports públicos de la capa de print.
 * Los componentes importan desde aquí.
 */

// Tipos base (para quien quiera construir data manualmente)
export type { PdfDocConfig, PdfTableColumn } from "./pdf";
export type { ExcelDocConfig, ExcelColumn } from "./excel";

// Templates — tipos de datos
export type { AttendanceListData, AttendanceListAttendee } from "./templates/attendance-list.template";
export type { GroupRosterData, GroupRosterMember } from "./templates/group-roster.template";
export type { MemberDirectoryData, MemberDirectoryEntry } from "./templates/member-directory.template";
export type { AttendanceHistoryData, AttendanceHistoryRow, AttendanceHistoryMeeting } from "./templates/attendance-history.template";
export type { TithesSummaryData, TithesSummaryRow, TithesSummaryMonth } from "./templates/tithes-summary.template";

// Templates — funciones de generación
export { generateAttendanceListPdf, generateAttendanceListExcel } from "./templates/attendance-list.template";
export { generateGroupRosterPdf, generateGroupRosterExcel } from "./templates/group-roster.template";
export { generateMemberDirectoryPdf, generateMemberDirectoryExcel } from "./templates/member-directory.template";
export { generateAttendanceHistoryPdf, generateAttendanceHistoryExcel } from "./templates/attendance-history.template";
export { generateTithesSummaryPdf, generateTithesSummaryExcel } from "./templates/tithes-summary.template";
