/**
 * Tithes API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiTitheResponse,
  ApiCreateTitheRequest,
  ApiBatchTitheItem,
  ApiBatchUpsertTithesRequest,
} from '../types';

const ENDPOINT = '/tithes';

export const tithesEndpoint = {
  /**
   * Get all tithe records
   */
  async getAll(): Promise<ApiTitheResponse[]> {
    return apiClient.get<ApiTitheResponse[]>(ENDPOINT);
  },

  /**
   * Create tithe record
   */
  async create(data: ApiCreateTitheRequest): Promise<ApiTitheResponse> {
    return apiClient.post<ApiTitheResponse>(ENDPOINT, data);
  },

  /**
   * Delete tithe record
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Get tithes by member — GET /tithes?memberId=:id
   */
  async getByMember(memberId: number): Promise<ApiTitheResponse[]> {
    return apiClient.get<ApiTitheResponse[]>(`${ENDPOINT}?memberId=${memberId}`);
  },

  /**
   * Get tithes by year and month — GET /tithes?year=:year&month=:month
   */
  async getByYearMonth(year: number, month: number): Promise<ApiTitheResponse[]> {
    return apiClient.get<ApiTitheResponse[]>(`${ENDPOINT}?year=${year}&month=${month}`);
  },

  /**
   * Batch create/delete tithe records — POST /tithes/batch
   */
  async batchUpsert(items: ApiBatchTitheItem[]): Promise<{ created: number; deleted: number }> {
    const body: ApiBatchUpsertTithesRequest = { items };
    return apiClient.post<{ created: number; deleted: number }>(`${ENDPOINT}/batch`, body);
  },
};
