/**
 * Meetings API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiMeetingResponse,
  ApiCreateMeetingRequest,
  ApiUpdateMeetingRequest,
} from '../types';

const ENDPOINT = '/meetings';

export const meetingsEndpoint = {
  /**
   * Get all meetings
   */
  async getAll(): Promise<ApiMeetingResponse[]> {
    return apiClient.get<ApiMeetingResponse[]>(ENDPOINT);
  },

  /**
   * Get meeting by ID
   */
  async getById(id: number): Promise<ApiMeetingResponse> {
    return apiClient.get<ApiMeetingResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create a new meeting
   */
  async create(data: ApiCreateMeetingRequest): Promise<ApiMeetingResponse> {
    return apiClient.post<ApiMeetingResponse>(ENDPOINT, data);
  },

  /**
   * Update a meeting
   */
  async update(id: number, data: ApiUpdateMeetingRequest): Promise<ApiMeetingResponse> {
    return apiClient.patch<ApiMeetingResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete a meeting
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Get meetings by type
   */
  async getByType(type: string): Promise<ApiMeetingResponse[]> {
    return apiClient.get<ApiMeetingResponse[]>(`${ENDPOINT}/type/${type}`);
  },

  /**
   * Get meetings by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<ApiMeetingResponse[]> {
    return apiClient.get<ApiMeetingResponse[]>(ENDPOINT, { startDate, endDate });
  },
};
