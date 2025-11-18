
"use server";

import {
  titheApiClient,
  type TitheRecord,
  type GetTithesParams,
  type SaveTitheStatusDto,
} from "@/lib/api-client/tithe";

/**
 * NOTA DE MIGRACIÓN:
 * Nuevo servicio de dominio para Diezmos. Reemplaza a `titheService.ts`.
 */

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene registros de diezmos, opcionalmente filtrados por año, mes o miembro.
 * Reemplaza a `getAllTitheRecords`.
 */
export async function getTitheRecords(params: GetTithesParams): Promise<TitheRecord[]> {
  try {
    return await titheApiClient.get(params);
  } catch (error) {
    console.error("Error al obtener los registros de diezmos:", error);
    return [];
  }
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Actualiza en lote el estado de los diezmos para un conjunto de miembros en un mes específico.
 * Reemplaza a `batchUpdateTithesForMonth` y `setTitheStatus`.
 */
export async function batchUpdateTithes(updates: SaveTitheStatusDto[]): Promise<boolean> {
  try {
    await titheApiClient.batchUpdateForMonth(updates);
    // En un escenario real, podrías querer revalidar la ruta de Next.js aquí si es necesario.
    // revalidatePath("/tithes");
    return true;
  } catch (error) {
    console.error("Error en la actualización por lote de diezmos:", error);
    return false;
  }
}

/**
 * NOTA: La función `deleteTithesForMember` ya no es necesaria en el frontend.
 * El borrado de los diezmos de un miembro debe ser manejado por el backend
 * cuando un miembro es eliminado, para mantener la integridad de los datos.
 */
