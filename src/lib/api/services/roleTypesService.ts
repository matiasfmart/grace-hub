/**
 * Role Types Service
 *
 * Orchestrates API calls and mapping for ecclesiastical label operations.
 * Role Types are labels like "Pastor", "Diácono", "Anciano", etc.
 */

import { roleTypesEndpoint } from '../endpoints';
import {
  mapApiRoleTypeToRoleType,
  mapApiRoleTypesToRoleTypes,
  mapRoleTypeToApiCreateRequest,
  type RoleType,
} from '../mappers';

export const roleTypesService = {
  /**
   * Get all role types (ecclesiastical labels)
   */
  async getAll(): Promise<RoleType[]> {
    const apiRoleTypes = await roleTypesEndpoint.getAll();
    return mapApiRoleTypesToRoleTypes(apiRoleTypes);
  },

  /**
   * Get role type by ID
   */
  async getById(id: string): Promise<RoleType> {
    const apiRoleType = await roleTypesEndpoint.getById(Number(id));
    return mapApiRoleTypeToRoleType(apiRoleType);
  },

  /**
   * Create a new role type (ecclesiastical label)
   */
  async create(name: string): Promise<RoleType> {
    const request = mapRoleTypeToApiCreateRequest(name);
    const apiRoleType = await roleTypesEndpoint.create(request);
    return mapApiRoleTypeToRoleType(apiRoleType);
  },

  /**
   * Update (rename) an existing role type.
   * All members with this label assigned reflect the new name automatically.
   */
  async update(id: string, name: string): Promise<RoleType> {
    const apiRoleType = await roleTypesEndpoint.update(Number(id), { name });
    return mapApiRoleTypeToRoleType(apiRoleType);
  },

  /**
   * Delete a role type
   */
  async delete(id: string): Promise<void> {
    await roleTypesEndpoint.delete(Number(id));
  },
};
