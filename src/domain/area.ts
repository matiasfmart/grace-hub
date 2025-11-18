
"use server";

import {
  areaApiClient,
  type Area,
  type CreateAreaDto,
  type UpdateAreaDto,
} from "@/lib/api-client/area";

/**
 * NOTA DE MIGRACIÓN:
 * Este es el nuevo "servicio de dominio" para las Áreas de Ministerio.
 * Reemplaza a `ministryAreaService.ts` y utiliza el `areaApiClient` para
 * interactuar con el nuevo backend relacional.
 *
 * La idea es que los componentes de la UI llamen a estas funciones en lugar
 * de a las del antiguo servicio. La interfaz se ha mantenido lo más
 * parecida posible para facilitar la migración.
 *
 * Los IDs ahora son numéricos, ya que provienen de una base de datos relacional.
 */

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene todas las áreas de ministerio.
 * Reemplaza a `getAllMinistryAreas`.
 */
export async function getAllAreas(): Promise<Area[]> {
  try {
    return await areaApiClient.getAll();
  } catch (error) {
    console.error("Error al obtener todas las áreas:", error);
    // Dependiendo de la política de errores, podrías devolver [] o relanzar.
    return [];
  }
}

/**
 * Obtiene un área de ministerio por su ID numérico.
 * Reemplaza a `getMinistryAreaById`.
 */
export async function getAreaById(id: number): Promise<Area | null> {
  try {
    return await areaApiClient.getById(id);
  } catch (error) {
    console.error(`Error al obtener el área con ID ${id}:`, error);
    return null;
  }
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Crea una nueva área de ministerio.
 * Reemplaza a `addMinistryArea`.
 *
 * La lógica de transacción que antes estaba aquí (actualizar miembros)
 * ahora debería estar en el backend (API) para garantizar la atomicidad.
 */
export async function addArea(
  areaData: CreateAreaDto
): Promise<Area | null> {
  try {
    return await areaApiClient.create(areaData);
  } catch (error) {
    console.error("Error al crear el área:", error);
    return null;
  }
}

/**
 * Actualiza un área de ministerio y sus miembros.
 * Reemplaza a `updateMinistryAreaAndSyncMembers`.
 *
 * La sincronización de miembros (añadir/quitar) se delega a la API.
 * El DTO de actualización puede incluir la lista de `member_ids`.
 */
export async function updateArea(
  areaId: number,
  updates: UpdateAreaDto
): Promise<Area | null> {
  try {
    return await areaApiClient.update(areaId, updates);
  } catch (error) {
    console.error(`Error al actualizar el área ${areaId}:`, error);
    return null;
  }
}

/**
 * Elimina un área de ministerio.
 * Reemplaza a `deleteMinistryArea`.
 *
 * La lógica de transacción (desasignar miembros, eliminar reuniones asociadas)
 * debe ser manejada por el backend para asegurar la integridad de los datos.
 */
export async function deleteArea(areaId: number): Promise<boolean> {
  try {
    await areaApiClient.delete(areaId);
    return true;
  } catch (error) {
    console.error(`Error al eliminar el área ${areaId}:`, error);
    return false;
  }
}

/**
 * Obtiene los miembros asociados a un área.
 * Nueva función para obtener datos relacionados.
 */
export async function getAreaMembers(areaId: number) {
  try {
    return await areaApiClient.getMembers(areaId);
  } catch (error) {
    console.error(`Error al obtener miembros para el área ${areaId}:`, error);
    return [];
  }
}

/**
 * Establece/reemplaza la lista de miembros de un área.
 * Función de utilidad para gestionar membresías de forma explícita.
 */
export async function setAreaMembers(areaId: number, memberIds: number[]) {
  try {
    await areaApiClient.setMembers(areaId, memberIds);
    return true;
  } catch (error) {
    console.error(`Error al establecer miembros para el área ${areaId}:`, error);
    return false;
  }
}
