/**
 * Role Types Mapper
 *
 * Translates API responses to frontend domain types for ecclesiastical labels.
 */

import type {
  ApiRoleTypeResponse,
  ApiCreateRoleTypeRequest,
} from '../types';

// ==============================================
// FRONTEND DOMAIN TYPES
// ==============================================

/**
 * RoleType - Ecclesiastical label (Pastor, Diácono, Anciano, etc.)
 */
export interface RoleType {
  id: string;
  name: string;
  createdAt?: string;
}

// ==============================================
// RESPONSE MAPPER (API → Frontend)
// ==============================================

/**
 * Maps API RoleType response to frontend RoleType
 */
export function mapApiRoleTypeToRoleType(api: ApiRoleTypeResponse): RoleType {
  return {
    id: String(api.roleTypeId),
    name: api.name,
    createdAt: api.createdAt,
  };
}

/**
 * Maps array of API RoleTypes to frontend RoleTypes
 */
export function mapApiRoleTypesToRoleTypes(apiRoleTypes: ApiRoleTypeResponse[]): RoleType[] {
  return apiRoleTypes.map(mapApiRoleTypeToRoleType);
}

// ==============================================
// REQUEST MAPPER (Frontend → API)
// ==============================================

/**
 * Maps frontend data to API create request
 */
export function mapRoleTypeToApiCreateRequest(name: string): ApiCreateRoleTypeRequest {
  return { name };
}
