
"use server";

import {
  meetingApiClient,
  type Meeting,
  type MeetingSeries,
  type CreateMeetingDto,
  type CreateMeetingSeriesDto,
  type UpdateMeetingDto,
  type UpdateMeetingSeriesDto,
  type GetMeetingsParams,
  type PaginatedMeetingsResponse,
} from "@/lib/api-client/meeting";

/**
 * NOTA DE MIGRACIÓN:
 * Servicio de dominio unificado para Reuniones y Series de Reuniones.
 * Reemplaza a `meetingService.ts` y `groupMeetingService.ts`.
 * La lógica de negocio compleja (generación de recurrencias, transacciones)
 * se delega completamente al backend a través del `meetingApiClient`.
 */

// ============================================
// SERIES DE REUNIONES
// ============================================

/**
 * Obtiene todas las series de reuniones, opcionalmente filtradas por grupo.
 * Reemplaza a `getAllMeetingSeries` y `getSeriesForGroup`.
 */
export async function getMeetingSeries(params?: { gdi_id?: number, area_id?: number }): Promise<MeetingSeries[]> {
  try {
    return await meetingApiClient.getAllSeries(params);
  } catch (error) {
    console.error("Error al obtener las series de reuniones:", error);
    return [];
  }
}

/**
 * Obtiene una serie de reunión por su ID.
 * Reemplaza a `getMeetingSeriesById` y `getSeriesByIdForGroup`.
 */
export async function getMeetingSeriesById(id: number): Promise<MeetingSeries | null> {
  try {
    return await meetingApiClient.getSeriesById(id);
  } catch (error) {
    console.error(`Error al obtener la serie de reunión con ID ${id}:`, error);
    return null;
  }
}

/**
 * Crea una nueva serie de reuniones.
 * Reemplaza a `addMeetingSeries` y `addMeetingSeriesForGroup`.
 */
export async function addMeetingSeries(seriesData: CreateMeetingSeriesDto): Promise<MeetingSeries | null> {
  try {
    return await meetingApiClient.createSeries(seriesData);
  } catch (error) {
    console.error("Error al crear la serie de reunión:", error);
    return null;
  }
}

/**
 * Actualiza una serie de reuniones.
 * Reemplaza a `updateMeetingSeries` y `updateMeetingSeriesForGroup`.
 */
export async function updateMeetingSeries(id: number, updates: UpdateMeetingSeriesDto): Promise<MeetingSeries | null> {
  try {
    return await meetingApiClient.updateSeries(id, updates);
  } catch (error) {
    console.error(`Error al actualizar la serie de reunión ${id}:`, error);
    return null;
  }
}

/**
 * Elimina una serie de reuniones.
 * Reemplaza a `deleteMeetingSeries` y `deleteMeetingSeriesForGroup`.
 */
export async function deleteMeetingSeries(id: number): Promise<boolean> {
  try {
    await meetingApiClient.deleteSeries(id);
    return true;
  } catch (error) {
    console.error(`Error al eliminar la serie de reunión ${id}:`, error);
    return false;
  }
}

// ============================================
// INSTANCIAS DE REUNIONES
// ============================================

/**
 * Obtiene una lista paginada y filtrada de instancias de reuniones.
 * Reemplaza a `getFilteredMeetingInstances` y `getGroupMeetingInstances`.
 */
export async function getMeetings(params: GetMeetingsParams): Promise<PaginatedMeetingsResponse> {
  try {
    return await meetingApiClient.getMeetings(params);
  } catch (error) {
    console.error("Error al obtener las instancias de reuniones:", error);
    return { instances: [], totalCount: 0, totalPages: 1 };
  }
}

/**
 * Obtiene una instancia de reunión por su ID.
 * Reemplaza a `getMeetingById`.
 */
export async function getMeetingById(id: number): Promise<Meeting | null> {
  try {
    return await meetingApiClient.getMeetingById(id);
  } catch (error) {
    console.error(`Error al obtener la reunión con ID ${id}:`, error);
    return null;
  }
}

/**
 * Crea una nueva instancia de reunión (manual o no).
 * Reemplaza a `addMeetingInstance` y `addMeetingInstanceForGroup`.
 */
export async function addMeeting(meetingData: CreateMeetingDto): Promise<Meeting | null> {
  try {
    return await meetingApiClient.createMeeting(meetingData);
  } catch (error) {
    console.error("Error al crear la instancia de reunión:", error);
    return null;
  }
}

/**
 * Actualiza una instancia de reunión.
 * Reemplaza a `updateMeeting` y `updateMeetingInstanceForGroup`.
 */
export async function updateMeeting(id: number, updates: UpdateMeetingDto): Promise<Meeting | null> {
  try {
    return await meetingApiClient.updateMeeting(id, updates);
  } catch (error) {
    console.error(`Error al actualizar la reunión ${id}:`, error);
    return null;
  }
}

/**
 * Elimina una instancia de reunión.
 * Reemplaza a `deleteMeetingInstance` y `deleteMeetingInstanceForGroup`.
 */
export async function deleteMeeting(id: number): Promise<boolean> {
  try {
    await meetingApiClient.deleteMeeting(id);
    return true;
  } catch (error) {
    console.error(`Error al eliminar la reunión ${id}:`, error);
    return false;
  }
}
