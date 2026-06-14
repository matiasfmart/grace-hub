/**
 * Attendance API Endpoints
 *
 * Raw API calls to the backend. Returns API types directly.
 */

import { apiClient } from '../client';
import type {
  ApiAttendanceResponse,
  ApiAttendanceStatsResponse,
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
    return apiClient.get<ApiAttendanceResponse[]>(`${ENDPOINT}?meetingId=${meetingId}`);
  },

  /**
   * Get attendance by member
   */
  async getByMember(memberId: number): Promise<ApiAttendanceResponse[]> {
    return apiClient.get<ApiAttendanceResponse[]>(`${ENDPOINT}?memberId=${memberId}`);
  },

  /**
   * Save attendance for a meeting
   * Uses POST /attendance/meeting/:meetingId endpoint
   */
  async saveForMeeting(
    meetingId: number,
    attendances: Array<{ memberId: number; wasPresent: boolean }>
  ): Promise<ApiAttendanceResponse[]> {
    return apiClient.post<ApiAttendanceResponse[]>(
      `${ENDPOINT}/meeting/${meetingId}`,
      { attendances }
    );
  },

  /**
   * Get attendance stats (present/absent/total) for a list of meetings.
   * Uses GET /attendance/stats?meetingIds=1,2,3
   */
  async getStats(meetingIds: number[]): Promise<ApiAttendanceStatsResponse[]> {
    const param = meetingIds.join(',');
    return apiClient.get<ApiAttendanceStatsResponse[]>(
      `${ENDPOINT}/stats?meetingIds=${param}`
    );
  },
};
