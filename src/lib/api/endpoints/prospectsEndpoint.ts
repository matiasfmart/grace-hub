import { apiClient } from '../client';
import type {
  ApiProspectResponse,
  ApiCreateProspectRequest,
  ApiUpdateProspectRequest,
  ApiIntegrateProspectRequest,
  ApiProspectCountResponse,
  ApiProspectStatus,
} from '../types';

const BASE = '/prospects';

export const prospectsEndpoint = {
  async getFiltered(status?: ApiProspectStatus): Promise<ApiProspectResponse[]> {
    const url = status ? `${BASE}?status=${status}` : BASE;
    return apiClient.get<ApiProspectResponse[]>(url);
  },

  async getById(id: number): Promise<ApiProspectResponse> {
    return apiClient.get<ApiProspectResponse>(`${BASE}/${id}`);
  },

  async countPending(): Promise<ApiProspectCountResponse> {
    return apiClient.get<ApiProspectCountResponse>(`${BASE}/count/pending`);
  },

  async create(data: ApiCreateProspectRequest): Promise<ApiProspectResponse> {
    return apiClient.post<ApiProspectResponse>(BASE, data);
  },

  async updateFields(id: number, data: ApiUpdateProspectRequest): Promise<ApiProspectResponse> {
    return apiClient.patch<ApiProspectResponse>(`${BASE}/${id}`, data);
  },

  async integrate(id: number, data: ApiIntegrateProspectRequest): Promise<ApiProspectResponse> {
    return apiClient.patch<ApiProspectResponse>(`${BASE}/${id}/integrate`, data);
  },

  async archive(id: number): Promise<ApiProspectResponse> {
    return apiClient.patch<ApiProspectResponse>(`${BASE}/${id}/archive`, {});
  },
};
