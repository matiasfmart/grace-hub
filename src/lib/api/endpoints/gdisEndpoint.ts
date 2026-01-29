/**
 * GDIs API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiGdiResponse,
  ApiCreateGdiRequest,
  ApiUpdateGdiRequest,
} from '../types';

const ENDPOINT = '/gdis';

export const gdisEndpoint = {
  /**
   * Get all GDIs
   */
  async getAll(): Promise<ApiGdiResponse[]> {
    return apiClient.get<ApiGdiResponse[]>(ENDPOINT);
  },

  /**
   * Get GDI by ID
   */
  async getById(id: number): Promise<ApiGdiResponse> {
    return apiClient.get<ApiGdiResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create a new GDI
   */
  async create(data: ApiCreateGdiRequest): Promise<ApiGdiResponse> {
    return apiClient.post<ApiGdiResponse>(ENDPOINT, data);
  },

  /**
   * Update a GDI
   */
  async update(id: number, data: ApiUpdateGdiRequest): Promise<ApiGdiResponse> {
    return apiClient.patch<ApiGdiResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete a GDI
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Assign member to GDI
   */
  async assignMember(gdiId: number, memberId: number): Promise<void> {
    return apiClient.post(`${ENDPOINT}/${gdiId}/members/${memberId}`, {});
  },

  /**
   * Remove member from GDI
   */
  async removeMember(gdiId: number, memberId: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${gdiId}/members/${memberId}`);
  },

  /**
   * Get GDI members
   */
  async getMembers(gdiId: number): Promise<number[]> {
    return apiClient.get<number[]>(`${ENDPOINT}/${gdiId}/members`);
  },
};
