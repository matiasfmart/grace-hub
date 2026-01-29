/**
 * Members API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 * Use the service layer for mapped frontend types.
 */

import { apiClient } from '../client';
import type {
  ApiMemberResponse,
  ApiCreateMemberRequest,
  ApiUpdateMemberRequest,
} from '../types';

const ENDPOINT = '/members';

export const membersEndpoint = {
  /**
   * Get all members
   */
  async getAll(): Promise<ApiMemberResponse[]> {
    return apiClient.get<ApiMemberResponse[]>(ENDPOINT);
  },

  /**
   * Get member by ID
   */
  async getById(id: number): Promise<ApiMemberResponse> {
    return apiClient.get<ApiMemberResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create a new member
   */
  async create(data: ApiCreateMemberRequest): Promise<ApiMemberResponse> {
    return apiClient.post<ApiMemberResponse>(ENDPOINT, data);
  },

  /**
   * Update a member
   */
  async update(id: number, data: ApiUpdateMemberRequest): Promise<ApiMemberResponse> {
    return apiClient.patch<ApiMemberResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete a member
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Get members by status
   */
  async getByStatus(status: string): Promise<ApiMemberResponse[]> {
    return apiClient.get<ApiMemberResponse[]>(`${ENDPOINT}/status/${status}`);
  },
};
