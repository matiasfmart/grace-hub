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
  ApiPaginatedMembersResponse,
  ApiMembersFilterParams,
} from '../types';

const ENDPOINT = '/members';

export const membersEndpoint = {
  /**
   * Get all members (simple, no filters)
   */
  async getAll(): Promise<ApiMemberResponse[]> {
    return apiClient.get<ApiMemberResponse[]>(ENDPOINT);
  },

  /**
   * Get members with filters, search, and pagination
   */
  async search(params: ApiMembersFilterParams = {}): Promise<ApiPaginatedMembersResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.set('page', params.page.toString());
    if (params.pageSize !== undefined) queryParams.set('pageSize', params.pageSize.toString());
    if (params.search) queryParams.set('search', params.search);
    if (params.status?.length) queryParams.set('status', params.status.join(','));
    if (params.role?.length) queryParams.set('role', params.role.join(','));
    if (params.gdi?.length) queryParams.set('gdi', params.gdi.join(','));
    if (params.area?.length) queryParams.set('area', params.area.join(','));

    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINT}/search?${queryString}` : `${ENDPOINT}/search`;
    
    return apiClient.get<ApiPaginatedMembersResponse>(url);
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
