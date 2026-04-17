/**
 * Meeting Series API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiMeetingSeriesResponse,
  ApiCreateMeetingSeriesRequest,
  ApiUpdateMeetingSeriesRequest,
  ApiMeetingSeriesFilters,
  ApiSeriesDateActionRequest,
} from '../types';

const ENDPOINT = '/meeting-series';

export const meetingSeriesEndpoint = {
  /**
   * Get all meeting series with optional filters
   */
  async getAll(filters?: ApiMeetingSeriesFilters): Promise<ApiMeetingSeriesResponse[]> {
    const params: Record<string, string | number> = {};
    if (filters?.gdiId) params.gdiId = filters.gdiId;
    if (filters?.areaId) params.areaId = filters.areaId;
    if (filters?.audienceType) params.audienceType = filters.audienceType;
    
    return apiClient.get<ApiMeetingSeriesResponse[]>(ENDPOINT, params);
  },

  /**
   * Get meeting series by ID
   */
  async getById(id: number): Promise<ApiMeetingSeriesResponse> {
    return apiClient.get<ApiMeetingSeriesResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create a new meeting series
   */
  async create(data: ApiCreateMeetingSeriesRequest): Promise<ApiMeetingSeriesResponse> {
    return apiClient.post<ApiMeetingSeriesResponse>(ENDPOINT, data);
  },

  /**
   * Update a meeting series
   */
  async update(id: number, data: ApiUpdateMeetingSeriesRequest): Promise<ApiMeetingSeriesResponse> {
    return apiClient.patch<ApiMeetingSeriesResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete a meeting series
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Get meeting series by GDI ID
   */
  async getByGdiId(gdiId: number): Promise<ApiMeetingSeriesResponse[]> {
    return this.getAll({ gdiId });
  },

  /**
   * Get meeting series by Area ID
   */
  async getByAreaId(areaId: number): Promise<ApiMeetingSeriesResponse[]> {
    return this.getAll({ areaId });
  },

  /**
   * Get general meeting series (all_active or by_categories audience types)
   */
  async getGeneralSeries(): Promise<ApiMeetingSeriesResponse[]> {
    const [allActive, byCategories] = await Promise.all([
      this.getAll({ audienceType: 'all_active' }),
      this.getAll({ audienceType: 'by_categories' }),
    ]);
    return [...allActive, ...byCategories];
  },

  /**
   * Cancel a date in a meeting series
   */
  async cancelDate(seriesId: number, date: string): Promise<ApiMeetingSeriesResponse> {
    const request: ApiSeriesDateActionRequest = { date };
    return apiClient.patch<ApiMeetingSeriesResponse>(`${ENDPOINT}/${seriesId}/cancel-date`, request);
  },

  /**
   * Restore a cancelled date in a meeting series
   */
  async restoreDate(seriesId: number, date: string): Promise<ApiMeetingSeriesResponse> {
    const request: ApiSeriesDateActionRequest = { date };
    return apiClient.patch<ApiMeetingSeriesResponse>(`${ENDPOINT}/${seriesId}/restore-date`, request);
  },
};
