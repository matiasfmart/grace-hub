
"use server";

import {
  memberApiClient,
  type Member,
  type CreateMemberDto,
  type UpdateMemberDto,
  type GetMembersParams,
  type PaginatedMembersResponse,
} from "@/lib/api-client/member";

/**
 * NOTA DE MIGRACIÓN:
 * Nuevo servicio de dominio para Miembros. Reemplaza a `memberService.ts`.
 * Utiliza `memberApiClient` para interactuar con el backend relacional.
 * La lógica de negocio compleja (transacciones, cálculo de roles) se delega al backend.
 */

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene una lista paginada y filtrada de miembros.
 * Reemplaza a `getAllMembers`.
 */
export async function getAllMembers(
  params: GetMembersParams
): Promise<PaginatedMembersResponse> {
  try {
    return await memberApiClient.getAll(params);
  } catch (error) {
    console.error("Error al obtener la lista de miembros:", error);
    // Devuelve una respuesta vacía en caso de error para no romper la UI
    return { members: [], totalMembers: 0, totalPages: 1 };
  }
}

/**
 * Obtiene todos los miembros sin paginar.
 * Reemplaza a `getAllMembersNonPaginated`.
 */
export async function getAllMembersNonPaginated(): Promise<Member[]> {
  try {
    return await memberApiClient.getAllNonPaginated();
  } catch (error) {
    console.error("Error al obtener todos los miembros (sin paginar):", error);
    return [];
  }
}

/**
 * Obtiene un miembro por su ID numérico.
 * Reemplaza a `getMemberById`.
 */
export async function getMemberById(id: number): Promise<Member | null> {
  try {
    return await memberApiClient.getById(id);
  } catch (error) {
    console.error(`Error al obtener el miembro con ID ${id}:`, error);
    return null;
  }
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Crea un nuevo miembro.
 * Reemplaza a `addMember`.
 */
export async function addMember(
  memberData: CreateMemberDto
): Promise<Member | null> {
  try {
    return await memberApiClient.create(memberData);
  } catch (error) {
    console.error("Error al crear el miembro:", error);
    return null;
  }
}

/**
 * Actualiza un miembro.
 * Reemplaza a `updateMember`.
 * La lógica de asignaciones y roles se maneja en el backend.
 */
export async function updateMember(
  memberId: number,
  updates: UpdateMemberDto
): Promise<Member | null> {
  try {
    return await memberApiClient.update(memberId, updates);
  } catch (error) {
    console.error(`Error al actualizar el miembro ${memberId}:`, error);
    return null;
  }
}

/**
 * Elimina un miembro.
 * Reemplaza a `deleteMember`.
 * La limpieza de datos relacionados (asistencias, diezmos, etc.) es responsabilidad del backend.
 */
export async function deleteMember(memberId: number): Promise<boolean> {
  try {
    await memberApiClient.delete(memberId);
    return true;
  } catch (error) {
    console.error(`Error al eliminar el miembro ${memberId}:`, error);
    return false;
  }
}

/**
 * NOTA: La función `bulkRecalculateAndUpdateRoles` ya no es necesaria en el frontend.
 * Esta lógica debería ser un efecto secundario de la actualización de un miembro,
 * GDI o Área, manejado directamente por el backend.
 */
