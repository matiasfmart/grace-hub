
"use server";

import {
  gdiApiClient,
  type Gdi,
  type CreateGdiDto,
  type UpdateGdiDto,
} from "@/lib/api-client/gdi";

/**
 * NOTA DE MIGRACIÓN:
 * Este es el nuevo "servicio de dominio" para los GDIs (Grupos de Integración).
 * Reemplaza a `gdiService.ts` y utiliza `gdiApiClient` para comunicarse
 * con el backend relacional.
 */

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene todos los GDIs.
 * Reemplaza a `getAllGdis`.
 */
export async function getAllGdis(): Promise<Gdi[]> {
  try {
    return await gdiApiClient.getAll();
  } catch (error) {
    console.error("Error al obtener todos los GDIs:", error);
    return [];
  }
}

/**
 * Obtiene un GDI por su ID numérico.
 * Reemplaza a `getGdiById`.
 */
export async function getGdiById(id: number): Promise<Gdi | null> {
  try {
    return await gdiApiClient.getById(id);
  } catch (error) {
    console.error(`Error al obtener el GDI con ID ${id}:`, error);
    return null;
  }
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Crea un nuevo GDI.
 * Reemplaza a `addGdi`.
 * La lógica de transacción ahora reside en el backend.
 */
export async function addGdi(
  gdiData: CreateGdiDto
): Promise<Gdi | null> {
  try {
    return await gdiApiClient.create(gdiData);
  } catch (error) {
    console.error("Error al crear el GDI:", error);
    return null;
  }
}

/**
 * Actualiza un GDI y sincroniza sus miembros.
 * Reemplaza a `updateGdiAndSyncMembers`.
 */
export async function updateGdi(
  gdiId: number,
  updates: UpdateGdiDto
): Promise<Gdi | null> {
  try {
    return await gdiApiClient.update(gdiId, updates);
  } catch (error) {
    console.error(`Error al actualizar el GDI ${gdiId}:`, error);
    return null;
  }
}

/**
 * Elimina un GDI.
 * Reemplaza a `deleteGdi`.
 * La lógica de borrado en cascada o limpieza se maneja en el backend.
 */
export async function deleteGdi(gdiId: number): Promise<boolean> {
  try {
    await gdiApiClient.delete(gdiId);
    return true;
  } catch (error) {
    console.error(`Error al eliminar el GDI ${gdiId}:`, error);
    return false;
  }
}

/**
 * Obtiene los miembros de un GDI.
 */
export async function getGdiMembers(gdiId: number) {
  try {
    return await gdiApiClient.getMembers(gdiId);
  } catch (error) {
    console.error(`Error al obtener miembros para el GDI ${gdiId}:`, error);
    return [];
  }
}

/**
 * Establece/reemplaza los miembros de un GDI.
 */
export async function setGdiMembers(gdiId: number, memberIds: number[]) {
  try {
    await gdiApiClient.setMembers(gdiId, memberIds);
    return true;
  } catch (error) {
    console.error(`Error al establecer miembros para el GDI ${gdiId}:`, error);
    return false;
  }
}
