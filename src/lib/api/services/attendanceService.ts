/**
 * Attendance Service
 *
 * Orchestrates API calls and mapping for attendance operations.
 */

import { attendanceEndpoint } from '../endpoints';
import {
  mapApiAttendanceToAttendanceRecord,
  mapApiAttendancesToAttendanceRecords,
  mapAttendanceRecordToApiCreateRequest,
  mapAttendanceRecordToApiUpdateRequest,
  mapApiAttendanceStats,
} from '../mappers';
import type { AttendanceRecord, AttendanceRecordWriteData, AttendanceMeetingStats } from '@/lib/types';

export const attendanceService = {
  /**
   * Get all attendance records
   */
  async getAll(): Promise<AttendanceRecord[]> {
    const apiAttendances = await attendanceEndpoint.getAll();
    return mapApiAttendancesToAttendanceRecords(apiAttendances);
  },

  /**
   * Get attendance by ID
   */
  async getById(id: string): Promise<AttendanceRecord> {
    const apiAttendance = await attendanceEndpoint.getById(Number(id));
    return mapApiAttendanceToAttendanceRecord(apiAttendance);
  },

  /**
   * Create attendance record
   */
  async create(data: AttendanceRecordWriteData): Promise<AttendanceRecord> {
    const request = mapAttendanceRecordToApiCreateRequest(data);
    const apiAttendance = await attendanceEndpoint.create(request);
    return mapApiAttendanceToAttendanceRecord(apiAttendance);
  },

  /**
   * Update attendance record
   */
  async update(id: string, data: Partial<AttendanceRecordWriteData>): Promise<AttendanceRecord> {
    const request = mapAttendanceRecordToApiUpdateRequest(data);
    const apiAttendance = await attendanceEndpoint.update(Number(id), request);
    return mapApiAttendanceToAttendanceRecord(apiAttendance);
  },

  /**
   * Delete attendance record
   */
  async delete(id: string): Promise<void> {
    await attendanceEndpoint.delete(Number(id));
  },

  /**
   * Get attendance for a meeting
   */
  async getByMeeting(meetingId: string): Promise<AttendanceRecord[]> {
    const apiAttendances = await attendanceEndpoint.getByMeeting(Number(meetingId));
    return mapApiAttendancesToAttendanceRecords(apiAttendances);
  },

  /**
   * Get attendance for a member
   */
  async getByMember(memberId: string): Promise<AttendanceRecord[]> {
    const apiAttendances = await attendanceEndpoint.getByMember(Number(memberId));
    return mapApiAttendancesToAttendanceRecords(apiAttendances);
  },

  /**
   * Save attendance records for a meeting
   */
  async bulkCreate(
    meetingId: string,
    attendees: Array<{ memberId: string; attended: boolean }>
  ): Promise<AttendanceRecord[]> {
    // Map frontend format to backend format
    const attendances = attendees.map(a => ({
      memberId: Number(a.memberId),
      wasPresent: a.attended,
    }));
    const apiAttendances = await attendanceEndpoint.saveForMeeting(Number(meetingId), attendances);
    return mapApiAttendancesToAttendanceRecords(apiAttendances);
  },

  /**
   * Record attendance for a meeting (helper method)
   */
  async recordMeetingAttendance(
    meetingId: string,
    presentMemberIds: string[],
    absentMemberIds: string[]
  ): Promise<AttendanceRecord[]> {
    const attendees = [
      ...presentMemberIds.map(memberId => ({ memberId, attended: true })),
      ...absentMemberIds.map(memberId => ({ memberId, attended: false })),
    ];
    return this.bulkCreate(meetingId, attendees);
  },

  /**
   * Get attendance summary for a member
   */
  async getMemberAttendanceSummary(memberId: string): Promise<{
    total: number;
    present: number;
    absent: number;
    rate: number;
  }> {
    const records = await this.getByMember(memberId);
    const total = records.length;
    const present = records.filter(r => r.attended).length;
    const absent = total - present;
    const rate = total > 0 ? (present / total) * 100 : 0;

    return { total, present, absent, rate };
  },

  /**
   * Get attendance stats (present/absent/total) for a list of meeting IDs.
   * More efficient than fetching full attendance records.
   */
  async getStatsByMeetings(meetingIds: string[]): Promise<AttendanceMeetingStats[]> {
    const ids = meetingIds.map(Number);
    const apiStats = await attendanceEndpoint.getStats(ids);
    return mapApiAttendanceStats(apiStats);
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all attendance records
 */
export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  return attendanceService.getAll();
}

/**
 * Get attendance records for a meeting
 */
export async function getAttendanceForMeeting(meetingId: string): Promise<AttendanceRecord[]> {
  return attendanceService.getByMeeting(meetingId);
}

/**
 * Save attendance for a meeting
 */
export async function saveAttendanceForMeeting(
  meetingId: string,
  attendanceData: Array<{ memberId: string; attended: boolean }>
): Promise<AttendanceRecord[]> {
  return attendanceService.bulkCreate(meetingId, attendanceData);
}

/**
 * Save meeting attendance (alias for saveAttendanceForMeeting)
 */
export async function saveMeetingAttendance(
  meetingId: string,
  memberAttendances: Array<{ memberId: string; attended: boolean; notes?: string }>
): Promise<void> {
  await attendanceService.bulkCreate(meetingId, memberAttendances);
}

/**
 * Get attendance stats for a list of meeting IDs.
 */
export async function getStatsByMeetings(meetingIds: string[]): Promise<AttendanceMeetingStats[]> {
  return attendanceService.getStatsByMeetings(meetingIds);
}

export default attendanceService;
