/**
 * Role Types API Endpoints
 *
 * Raw API calls to the backend for ecclesiastical labels (Pastor, Diácono, etc.)
 * Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiRoleTypeResponse,
  ApiCreateRoleTypeRequest,
  ApiUpdateRoleTypeRequest,
} from '../types';

const ENDPOINT = '/role-types';

export const roleTypesEndpoint = {
  /**
   * Get all role types
   */
  async getAll(): Promise<ApiRoleTypeResponse[]> {
    return apiClient.get<ApiRoleTypeResponse[]>(ENDPOINT);
  },

  /**
   * Get role type by ID
   */
  async getById(id: number): Promise<ApiRoleTypeResponse> {
    return apiClient.get<ApiRoleTypeResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create new role type
   */
  async create(data: ApiCreateRoleTypeRequest): Promise<ApiRoleTypeResponse> {
    return apiClient.post<ApiRoleTypeResponse>(ENDPOINT, data);
  },

  /**
   * Update (rename) an existing role type
   */
  async update(id: number, data: ApiUpdateRoleTypeRequest): Promise<ApiRoleTypeResponse> {
    return apiClient.patch<ApiRoleTypeResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete role type
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },
};
