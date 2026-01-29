/**
 * Roles API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiRoleResponse,
  ApiCreateRoleRequest,
  ApiUpdateRoleRequest,
} from '../types';

const ENDPOINT = '/roles';

export const rolesEndpoint = {
  /**
   * Get all role assignments
   */
  async getAll(): Promise<ApiRoleResponse[]> {
    return apiClient.get<ApiRoleResponse[]>(ENDPOINT);
  },

  /**
   * Get role by ID
   */
  async getById(id: number): Promise<ApiRoleResponse> {
    return apiClient.get<ApiRoleResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create role assignment
   */
  async create(data: ApiCreateRoleRequest): Promise<ApiRoleResponse> {
    return apiClient.post<ApiRoleResponse>(ENDPOINT, data);
  },

  /**
   * Update role assignment
   */
  async update(id: number, data: ApiUpdateRoleRequest): Promise<ApiRoleResponse> {
    return apiClient.patch<ApiRoleResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete role assignment
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Get roles by member
   */
  async getByMember(memberId: number): Promise<ApiRoleResponse[]> {
    return apiClient.get<ApiRoleResponse[]>(`${ENDPOINT}/member/${memberId}`);
  },

  /**
   * Get members by role type
   */
  async getByRoleType(roleType: string): Promise<ApiRoleResponse[]> {
    return apiClient.get<ApiRoleResponse[]>(`${ENDPOINT}/type/${roleType}`);
  },
};
