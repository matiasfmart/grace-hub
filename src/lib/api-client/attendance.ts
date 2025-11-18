
// Reemplazar con la URL base de tu API de backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Tipos de datos para el cliente de API de Asistencia, basados en el esquema relacional.
 */

// Corresponde a la tabla 'attendance'
export interface AttendanceRecord {
  attendance_id: number;
  meeting_id: number;
  member_id: number;
  was_present: boolean;
  was_active: boolean;
  // Los campos de snapshot se asume que los crea el backend
  snapshot_role_general: string;
  snapshot_role_specific: string | null;
  snapshot_gdi_id: number | null;
  snapshot_area_id: number | null;
}

// DTO para guardar (upsert) la asistencia de un miembro a una reunión
export interface SaveAttendanceDto {
  member_id: number;
  was_present: boolean;
  was_active: boolean; // Asumiendo que este campo también se envía
}

// Parámetros para obtener registros de asistencia
export interface GetAttendanceParams {
  meeting_id?: number;
  member_id?: number;
}

// Función de ayuda genérica para fetch
async function fetchApi(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Error desconocido" }));
    throw new Error(errorBody.message || "Error en la petición a la API");
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

// ============================================
// CLIENTE DE API PARA ASISTENCIA
// ============================================

export const attendanceApiClient = {
  /**
   * Obtiene registros de asistencia, filtrados por reunión o miembro.
   */
  get: async (params: GetAttendanceParams): Promise<AttendanceRecord[]> => {
    const query = new URLSearchParams();
    if (params.meeting_id) query.append("meeting_id", params.meeting_id.toString());
    if (params.member_id) query.append("member_id", params.member_id.toString());
    return fetchApi(`${API_BASE_URL}/attendance?${query.toString()}`);
  },

  /**
   * Guarda (upsert) la asistencia para una reunión completa.
   * El backend debería procesar esto como una transacción.
   */
  saveForMeeting: async (meetingId: number, attendanceData: SaveAttendanceDto[]): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/attendance/meeting/${meetingId}`, {
      method: "POST", // o PUT, dependiendo de la semántica de tu API
      body: JSON.stringify(attendanceData),
    });
  },
};
