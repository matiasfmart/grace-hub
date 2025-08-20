
'use server';
import type { AttendanceRecord, Meeting, Member } from '@/lib/types';
import { findDocuments, findOneDocument } from '@/lib/db-utils';
import { getResolvedAttendeesForMeeting } from './meetingService';
import { Collection } from 'mongodb';

const ATTENDANCE_COLLECTION = 'attendance';

async function getCollection(): Promise<Collection<AttendanceRecord>> {
    const { getCollection: get } = await import('@/lib/db-utils');
    return get(ATTENDANCE_COLLECTION);
}

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
  const collection = await getCollection();

  const bulkOps = memberAttendances.map(att => {
    const filter = { meetingId, memberId: att.memberId };
    const update = {
      $set: {
        attended: att.attended,
        notes: att.notes || ''
      },
      $setOnInsert: {
        id: `${meetingId}-${att.memberId}`,
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
    await collection.bulkWrite(bulkOps as any);
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
