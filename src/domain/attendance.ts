
"use server";

import {
  attendanceApiClient,
  type AttendanceRecord,
  type GetAttendanceParams,
  type SaveAttendanceDto,
} from "@/lib/api-client/attendance";

/**
 * NOTA DE MIGRACIÓN:
 * Nuevo servicio de dominio para Asistencia. Reemplaza a `attendanceService.ts`.
 */

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene los registros de asistencia para una reunión específica.
 * Reemplaza a `getAttendanceForMeeting`.
 */
export async function getAttendanceForMeeting(meetingId: number): Promise<AttendanceRecord[]> {
  try {
    return await attendanceApiClient.get({ meeting_id: meetingId });
  } catch (error) {
    console.error(`Error al obtener la asistencia para la reunión ${meetingId}:`, error);
    return [];
  }
}

/**
 * Obtiene todos los registros de asistencia para un miembro específico.
 */
export async function getAttendanceForMember(memberId: number): Promise<AttendanceRecord[]> {
  try {
    return await attendanceApiClient.get({ member_id: memberId });
  } catch (error) {
    console.error(`Error al obtener la asistencia para el miembro ${memberId}:`, error);
    return [];
  }
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Guarda la asistencia para una reunión. Realiza una operación de "upsert".
 * Reemplaza a `saveMeetingAttendance`.
 */
export async function saveMeetingAttendance(
  meetingId: number,
  memberAttendances: SaveAttendanceDto[]
): Promise<boolean> {
  try {
    await attendanceApiClient.saveForMeeting(meetingId, memberAttendances);
    return true;
  } catch (error) {
    console.error(`Error al guardar la asistencia para la reunión ${meetingId}:`, error);
    return false;
  }
}

/**
 * NOTA: Las funciones de borrado como `deleteAttendanceForMeeting` o `deleteAttendanceForMember`
 * ya no son necesarias en el frontend. Esta lógica de limpieza debe ser manejada
 * por el backend como un efecto secundario de eliminar una reunión o un miembro
 * para garantizar la integridad referencial de la base de datos.
 */
