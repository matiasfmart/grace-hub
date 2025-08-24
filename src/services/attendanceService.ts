'use server';
import type { AttendanceRecord, Meeting, Member } from '@/lib/types';
import { findDocuments, deleteManyDocuments, getCollection } from '@/lib/db-utils';
import { getResolvedAttendeesForMeeting } from './meetingService';

const ATTENDANCE_COLLECTION = 'attendance';

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  return findDocuments<AttendanceRecord>(ATTENDANCE_COLLECTION);
}

export async function getAttendanceForMeeting(meetingId: string): Promise<AttendanceRecord[]> {
  return findDocuments<AttendanceRecord>(ATTENDANCE_COLLECTION, { meetingId });
}

export async function saveMeetingAttendance(
  meetingId: string,
  memberAttendances: Array<{ memberId: string; attended: boolean; notes?: string }>
): Promise<void> {
  const collection = await getCollection(ATTENDANCE_COLLECTION);

  const bulkOps = memberAttendances.map(att => {
    const filter = { meetingId, memberId: att.memberId };
    const update = {
      $set: {
        attended: att.attended,
        notes: att.notes || ''
      },
      $setOnInsert: {
        ...filter
      }
    };
    return {
      updateOne: {
        filter: filter,
        update: update,
        upsert: true
      }
    };
  });

  if (bulkOps.length > 0) {
    await collection.bulkWrite(bulkOps);
  }
}

/**
 * Resolves the list of members who are expected to attend a specific meeting instance.
 * This function now delegates the complex resolution logic to the meetingService.
 * @param meeting The meeting instance.
 * @returns A sorted array of members expected to attend.
 */
export async function getResolvedAttendees(meeting: Meeting): Promise<Member[]> {
    return getResolvedAttendeesForMeeting(meeting);
}


/**
 * Deletes all attendance records associated with a specific meeting.
 * @param meetingId The ID of the meeting whose attendance records should be deleted.
 * @returns The number of deleted records.
 */
export async function deleteAttendanceForMeeting(meetingId: string): Promise<number> {    
    const result = await deleteManyDocuments(ATTENDANCE_COLLECTION, { meetingId });
    return result.deletedCount;
}

/**
 * Deletes all attendance records associated with a list of meeting IDs.
 * @param meetingIds An array of meeting IDs.
 * @returns The number of deleted records.
 */
export async function deleteAttendanceForMeetings(meetingIds: string[]): Promise<number> {    
    const result = await deleteManyDocuments(ATTENDANCE_COLLECTION, { meetingId: { $in: meetingIds } });
    return result.deletedCount;
}

/**
 * Deletes all attendance records for a specific member.
 * @param memberId The ID of the member.
 * @returns The number of deleted records.
 */
export async function deleteAttendanceForMember(memberId: string): Promise<number> {    
    const result = await deleteManyDocuments(ATTENDANCE_COLLECTION, { memberId });
    return result.deletedCount;
}