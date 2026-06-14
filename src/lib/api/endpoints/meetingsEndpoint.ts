/**
 * Meetings API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiMeetingResponse,
  ApiMeetingsCountBySeriesResponse,
  ApiCreateMeetingRequest,
  ApiUpdateMeetingRequest,
  ApiExpectedAttendeeResponse,
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
   * Get meetings by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<ApiMeetingResponse[]> {
    return apiClient.get<ApiMeetingResponse[]>(ENDPOINT, { startDate, endDate });
  },

  /**
   * Get meetings by series ID
   */
  async getBySeriesId(seriesId: number): Promise<ApiMeetingResponse[]> {
    return apiClient.get<ApiMeetingResponse[]>(ENDPOINT, { seriesId: String(seriesId) });
  },

  /**
   * Get meetings with filters
   */
  async getWithFilters(filters: { seriesId?: number; startDate?: string; endDate?: string }): Promise<ApiMeetingResponse[]> {
    const params: Record<string, string> = {};
    if (filters.seriesId) params.seriesId = String(filters.seriesId);
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return apiClient.get<ApiMeetingResponse[]>(ENDPOINT, params);
  },

  /**
   * Get expected attendees for a meeting
   */
  async getExpectedAttendees(meetingId: number): Promise<ApiExpectedAttendeeResponse[]> {
    return apiClient.get<ApiExpectedAttendeeResponse[]>(`${ENDPOINT}/${meetingId}/expected-attendees`);
  },

  /**
   * Get meeting count grouped by series.
   * Uses GET /meetings/count-by-series
   */
  async getCountBySeries(): Promise<ApiMeetingsCountBySeriesResponse[]> {
    return apiClient.get<ApiMeetingsCountBySeriesResponse[]>(`${ENDPOINT}/count-by-series`);
  },
};
