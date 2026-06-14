/**
 * Attendance Mapper
 *
 * Translates API responses to frontend domain types.
 */

import type { ApiAttendanceResponse, ApiAttendanceStatsResponse, ApiCreateAttendanceRequest, ApiUpdateAttendanceRequest } from '../types';
import type { AttendanceRecord, AttendanceRecordWriteData, AttendanceMeetingStats } from '@/lib/types';

/**
 * Maps API Attendance response to frontend AttendanceRecord type
 */
export function mapApiAttendanceToAttendanceRecord(apiAttendance: ApiAttendanceResponse): AttendanceRecord {
  return {
    id: String(apiAttendance.attendanceId),
    meetingId: String(apiAttendance.meetingId),
    memberId: String(apiAttendance.memberId),
    attended: apiAttendance.wasPresent,
    notes: undefined,
  };
}

/**
 * Maps array of API Attendances to frontend AttendanceRecords
 */
export function mapApiAttendancesToAttendanceRecords(apiAttendances: ApiAttendanceResponse[]): AttendanceRecord[] {
  return apiAttendances.map(mapApiAttendanceToAttendanceRecord);
}

/**
 * Maps frontend AttendanceRecord write data to API create request
 */
export function mapAttendanceRecordToApiCreateRequest(record: AttendanceRecordWriteData): ApiCreateAttendanceRequest {
  return {
    meetingId: Number(record.meetingId),
    memberId: Number(record.memberId),
    wasPresent: record.attended,
  };
}

/**
 * Maps frontend AttendanceRecord partial data to API update request
 */
export function mapAttendanceRecordToApiUpdateRequest(record: Partial<AttendanceRecordWriteData>): ApiUpdateAttendanceRequest {
  const request: ApiUpdateAttendanceRequest = {};

  if (record.attended !== undefined) request.wasPresent = record.attended;

  return request;
}

/**
 * Maps bulk attendance records for batch creation
 */
export function mapBulkAttendanceToApiRequests(
  meetingId: string,
  attendees: Array<{ memberId: string; attended: boolean }>
): ApiCreateAttendanceRequest[] {
  return attendees.map(({ memberId, attended }) => ({
    meetingId: Number(meetingId),
    memberId: Number(memberId),
    wasPresent: attended,
  }));
}

/**
 * Maps API attendance stats array to frontend AttendanceMeetingStats array.
 */
export function mapApiAttendanceStats(
  stats: ApiAttendanceStatsResponse[]
): AttendanceMeetingStats[] {
  return stats.map((s) => ({
    meetingId: String(s.meetingId),
    presentCount: s.presentCount,
    absentCount: s.absentCount,
    totalExpected: s.totalExpected,
  }));
}
