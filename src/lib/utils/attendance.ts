/**
 * Attendance Utilities
 *
 * Shared logic for determining member attendance expectations and computing
 * attendance statistics. Centralizes the "is member expected?" resolution
 * that previously was duplicated across components with a broken implementation
 * (relying on attendeeUids which is never populated by the backend).
 *
 * Resolution strategy:
 *   1. If an attendance record exists for the meeting → member was tracked
 *      (handles historical assignment changes, i.e., member was in GDI X, now in GDI Y)
 *   2. Derive from series.audienceType + member's current assignments
 */

import { endOfDay, format, isValid, isWithinInterval, parseISO, startOfDay, startOfYear, endOfYear, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Member, Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';

// ============================================================
// TYPES
// ============================================================

export type AttendanceStatus = 'attended' | 'absent' | 'pending_past' | 'pending_future';

export interface AttendanceMeetingPoint {
  meetingId: string;
  meetingDate: string; // YYYY-MM-DD
  seriesId: string;
  seriesName: string;
  status: AttendanceStatus;
}

export interface MonthlyAttendanceSummary {
  monthValue: string;   // YYYY-MM — used for sorting
  monthDisplay: string; // e.g. "abr 2026" — used for axis labels
  attended: number;
  absent: number;
  convocated: number;   // attended + absent (does not include pending)
}

export interface AttendanceStats {
  attendanceRate: number; // percentage among recorded meetings
  convocated: number;     // total meetings expected in the period
  attended: number;
  absent: number;
  unreported: number;     // past meetings with no record
}

// ============================================================
// CORE PREDICATE
// ============================================================

/**
 * Determines if a member was expected at a specific meeting.
 *
 * Pass a pre-built Set<`${meetingId}:${memberId}`> for O(1) lookup.
 */
export function isMemberExpectedAtMeeting(
  member: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'>,
  meeting: Meeting,
  series: MeetingSeries | undefined,
  attendanceRecordSet: Set<string>,
): boolean {
  // If a record was ever created the member was tracked — even if assignment changed later
  if (attendanceRecordSet.has(`${meeting.id}:${member.id}`)) return true;

  if (!series) return false;

  switch (series.audienceType) {
    case 'all_active':
    case 'integrated':
      return true;
    case 'gdi':
      return (
        !!member.assignedGDIId &&
        !!series.gdiId &&
        member.assignedGDIId === series.gdiId
      );
    case 'area':
      return (member.assignedAreaIds ?? []).some((id) => id === series.areaId);
    // 'workers', 'leaders', 'mentors', 'by_categories' require role-based resolution
    // not yet implemented — fall through to false
    default:
      return false;
  }
}

// ============================================================
// AGGREGATE COMPUTATION
// ============================================================

export interface ComputedAttendanceData {
  meetings: AttendanceMeetingPoint[];
  monthlySummary: MonthlyAttendanceSummary[];
  stats: AttendanceStats;
}

/**
 * Computes all attendance data for a member for a given year and series filter.
 * Should be called once per render cycle and results shared across chart + table.
 *
 * @param member       - Member (needs id, assignedGDIId, assignedAreaIds)
 * @param year         - Calendar year to filter (e.g. 2026)
 * @param seriesFilter - Series ID string or 'all'
 * @param allMeetings
 * @param allMeetingSeries
 * @param allAttendanceRecords
 */
export function computeMemberAttendanceData(
  member: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'>,
  year: number,
  seriesFilter: string,
  allMeetings: Meeting[],
  allMeetingSeries: MeetingSeries[],
  allAttendanceRecords: AttendanceRecord[],
): ComputedAttendanceData {
  // Build lookup structures once
  const seriesMap = new Map<string, MeetingSeries>(allMeetingSeries.map((s) => [s.id, s]));

  const recordSet = new Set<string>(
    allAttendanceRecords.map((r) => `${r.meetingId}:${r.memberId}`),
  );

  const recordMap = new Map<string, AttendanceRecord>(
    allAttendanceRecords
      .filter((r) => r.memberId === member.id)
      .map((r) => [r.meetingId, r]),
  );

  // Year boundary (inclusive)
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfDay(
    year === new Date().getFullYear() ? new Date() : endOfYear(new Date(year, 0, 1)),
  );

  const meetings: AttendanceMeetingPoint[] = [];
  const monthlyMap = new Map<string, { attended: number; absent: number; convocated: number }>();

  for (const meeting of allMeetings) {
    const series = seriesMap.get(meeting.seriesId);

    // Series filter
    if (seriesFilter !== 'all' && meeting.seriesId !== seriesFilter) continue;

    // Year filter
    const meetingDate = parseISO(meeting.date);
    if (!isValid(meetingDate)) continue;
    if (!isWithinInterval(meetingDate, { start: startOfDay(yearStart), end: yearEnd })) continue;

    // Expectation check
    if (!isMemberExpectedAtMeeting(member, meeting, series, recordSet)) continue;

    // Status
    const record = recordMap.get(meeting.id);
    let status: AttendanceStatus;

    if (isPast(meetingDate) && !isToday(meetingDate)) {
      if (record) {
        status = record.attended ? 'attended' : 'absent';
      } else {
        status = 'pending_past';
      }
    } else {
      if (record) {
        status = record.attended ? 'attended' : 'absent';
      } else {
        status = 'pending_future';
      }
    }

    meetings.push({
      meetingId: meeting.id,
      meetingDate: meeting.date,
      seriesId: meeting.seriesId,
      seriesName: series?.name ?? 'Serie desconocida',
      status,
    });

    // Monthly aggregation (only count recorded meetings)
    if (status === 'attended' || status === 'absent') {
      const monthKey = format(meetingDate, 'yyyy-MM');
      const entry = monthlyMap.get(monthKey) ?? { attended: 0, absent: 0, convocated: 0 };
      if (status === 'attended') entry.attended++;
      else entry.absent++;
      entry.convocated++;
      monthlyMap.set(monthKey, entry);
    }
  }

  // Sort meetings newest-first
  meetings.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));

  // Build monthly summary sorted oldest-first for the chart
  const monthlySummary: MonthlyAttendanceSummary[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthValue, data]) => ({
      monthValue,
      monthDisplay: format(parseISO(`${monthValue}-01`), 'MMM yyyy', { locale: es }),
      attended: data.attended,
      absent: data.absent,
      convocated: data.convocated,
    }));

  // Stats
  const attended = meetings.filter((m) => m.status === 'attended').length;
  const absent = meetings.filter((m) => m.status === 'absent').length;
  const unreported = meetings.filter((m) => m.status === 'pending_past').length;
  const recorded = attended + absent;
  const attendanceRate = recorded > 0 ? Math.round((attended / recorded) * 100) : 0;

  return {
    meetings,
    monthlySummary,
    stats: {
      attendanceRate,
      convocated: meetings.length,
      attended,
      absent,
      unreported,
    },
  };
}
