/**
 * Tithes API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiTitheResponse,
  ApiCreateTitheRequest,
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
   * Get tithe by ID
   */
  async getById(id: number): Promise<ApiTitheResponse> {
    return apiClient.get<ApiTitheResponse>(`${ENDPOINT}/${id}`);
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
   * Get tithes by member
   */
  async getByMember(memberId: number): Promise<ApiTitheResponse[]> {
    return apiClient.get<ApiTitheResponse[]>(`${ENDPOINT}/member/${memberId}`);
  },

  /**
   * Get tithes by year
   */
  async getByYear(year: number): Promise<ApiTitheResponse[]> {
    return apiClient.get<ApiTitheResponse[]>(`${ENDPOINT}/year/${year}`);
  },

  /**
   * Get tithes by year and month
   */
  async getByYearMonth(year: number, month: number): Promise<ApiTitheResponse[]> {
    return apiClient.get<ApiTitheResponse[]>(`${ENDPOINT}/year/${year}/month/${month}`);
  },
};
