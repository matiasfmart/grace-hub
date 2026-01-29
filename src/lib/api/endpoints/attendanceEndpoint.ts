/**
 * Attendance API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiAttendanceResponse,
  ApiCreateAttendanceRequest,
  ApiUpdateAttendanceRequest,
} from '../types';

const ENDPOINT = '/attendance';

export const attendanceEndpoint = {
  /**
   * Get all attendance records
   */
  async getAll(): Promise<ApiAttendanceResponse[]> {
    return apiClient.get<ApiAttendanceResponse[]>(ENDPOINT);
  },

  /**
   * Get attendance by ID
   */
  async getById(id: number): Promise<ApiAttendanceResponse> {
    return apiClient.get<ApiAttendanceResponse>(`${ENDPOINT}/${id}`);
  },

  /**
   * Create attendance record
   */
  async create(data: ApiCreateAttendanceRequest): Promise<ApiAttendanceResponse> {
    return apiClient.post<ApiAttendanceResponse>(ENDPOINT, data);
  },

  /**
   * Update attendance record
   */
  async update(id: number, data: ApiUpdateAttendanceRequest): Promise<ApiAttendanceResponse> {
    return apiClient.patch<ApiAttendanceResponse>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Delete attendance record
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Get attendance by meeting
   */
  async getByMeeting(meetingId: number): Promise<ApiAttendanceResponse[]> {
    return apiClient.get<ApiAttendanceResponse[]>(`${ENDPOINT}/meeting/${meetingId}`);
  },

  /**
   * Get attendance by member
   */
  async getByMember(memberId: number): Promise<ApiAttendanceResponse[]> {
    return apiClient.get<ApiAttendanceResponse[]>(`${ENDPOINT}/member/${memberId}`);
  },

  /**
   * Bulk create attendance records
   */
  async bulkCreate(records: ApiCreateAttendanceRequest[]): Promise<ApiAttendanceResponse[]> {
    return apiClient.post<ApiAttendanceResponse[]>(`${ENDPOINT}/bulk`, records);
  },
};
