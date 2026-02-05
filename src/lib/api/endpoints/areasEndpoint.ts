/**
 * Areas (Ministry Areas) API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiAreaResponse,
  ApiCreateAreaRequest,
  ApiUpdateAreaRequest,
} from '../types';

const ENDPOINT = '/areas';

export const areasEndpoint = {
  /**
   * Get all areas
   */
  async getAll(): Promise<ApiAreaResponse[]> {
    return apiClient.get<ApiAreaResponse[]>(ENDPOINT);
  },

  /**
   * Get area by ID
   */
  async getById(id: number): Promise<ApiAreaResponse> {
    return apiClient.get<ApiAreaResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create a new area
   */
  async create(data: ApiCreateAreaRequest): Promise<ApiAreaResponse> {
    return apiClient.post<ApiAreaResponse>(ENDPOINT, data);
  },

  /**
   * Update an area
   */
  async update(id: number, data: ApiUpdateAreaRequest): Promise<ApiAreaResponse> {
    return apiClient.put<ApiAreaResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete an area
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Assign member to area
   */
  async assignMember(areaId: number, memberId: number): Promise<void> {
    return apiClient.post(`${ENDPOINT}/${areaId}/members/${memberId}`, {});
  },

  /**
   * Remove member from area
   */
  async removeMember(areaId: number, memberId: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${areaId}/members/${memberId}`);
  },

  /**
   * Get area members
   */
  async getMembers(areaId: number): Promise<{ memberIds: number[] }> {
    return apiClient.get<{ memberIds: number[] }>(`${ENDPOINT}/${areaId}/members`);
  },
};
