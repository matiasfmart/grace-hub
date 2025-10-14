"use server";
import {
	deleteManyDocuments,
	findDocuments,
	getCollection,
} from "@/lib/db-utils";
import { toObjectId, toObjectIds } from "@/lib/id-utils";
import type {
	AttendanceRecord,
	AttendanceRecordDocument,
	Meeting,
	Member,
} from "@/lib/types";
import { getResolvedAttendeesForMeeting } from "./meetingService";

const ATTENDANCE_COLLECTION = "attendance";

// ============================================
// READ OPERATIONS
// ============================================

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
	return findDocuments<AttendanceRecordDocument>(ATTENDANCE_COLLECTION);
}

export async function getAttendanceForMeeting(
	meetingId: string,
): Promise<AttendanceRecord[]> {
	const meetingOid = toObjectId(meetingId);
	if (!meetingOid) return [];
	return findDocuments<AttendanceRecordDocument>(ATTENDANCE_COLLECTION, {
		meetingId: meetingOid,
	});
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function saveMeetingAttendance(
	meetingId: string,
	memberAttendances: Array<{
		memberId: string;
		attended: boolean;
		notes?: string;
	}>,
): Promise<void> {
	const meetingOid = toObjectId(meetingId);
	if (!meetingOid) throw new Error("Invalid Meeting ID");

	const collection = await getCollection(ATTENDANCE_COLLECTION);

	const bulkOps = memberAttendances.map((att) => {
		const memberOid = toObjectId(att.memberId);
		if (!memberOid) throw new Error(`Invalid Member ID: ${att.memberId}`);

		const filter = { meetingId: meetingOid, memberId: memberOid };
		const update = {
			$set: {
				attended: att.attended,
				notes: att.notes || "",
			},
			$setOnInsert: {
				...filter,
			},
		};
		return {
			updateOne: {
				filter: filter,
				update: update,
				upsert: true,
			},
		};
	});

	if (bulkOps.length > 0) {
		await collection.bulkWrite(bulkOps);
	}
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resolves the list of members who are expected to attend a specific meeting instance.
 * This function now delegates the complex resolution logic to the meetingService.
 */
export async function getResolvedAttendees(
	meeting: Meeting,
): Promise<Member[]> {
	return getResolvedAttendeesForMeeting(meeting);
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Deletes all attendance records associated with a specific meeting.
 */
export async function deleteAttendanceForMeeting(
	meetingId: string,
): Promise<number> {
	const meetingOid = toObjectId(meetingId);
	if (!meetingOid) return 0;

	const result = await deleteManyDocuments(ATTENDANCE_COLLECTION, {
		meetingId: meetingOid,
	});
	return result.deletedCount;
}

/**
 * Deletes all attendance records associated with a list of meeting IDs.
 */
export async function deleteAttendanceForMeetings(
	meetingIds: string[],
): Promise<number> {
	const meetingOids = toObjectIds(meetingIds);
	if (meetingOids.length === 0) return 0;

	const result = await deleteManyDocuments(ATTENDANCE_COLLECTION, {
		meetingId: { $in: meetingOids } as any,
	});
	return result.deletedCount;
}

/**
 * Deletes all attendance records for a specific member.
 */
export async function deleteAttendanceForMember(
	memberId: string,
): Promise<number> {
	const memberOid = toObjectId(memberId);
	if (!memberOid) return 0;

	const result = await deleteManyDocuments(ATTENDANCE_COLLECTION, {
		memberId: memberOid,
	});
	return result.deletedCount;
}
