"use server";
import {
	addDays,
	addMonths,
	addWeeks,
	type Day,
	format,
	getDate,
	getDay,
	getDaysInMonth,
	isSameDay,
	lastDayOfMonth,
	nextDay,
	parseISO,
	setDate,
	setDay,
	startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Collection, Filter } from "mongodb";
import {
	countDocuments,
	deleteOneDocument,
	findDocuments,
	findOneDocument,
	getCollection as getCollectionDb,
	insertOneDocument,
	updateOneDocument,
	withTransaction,
} from "@/lib/db-utils";
import { toObjectId, toObjectIds } from "@/lib/id-utils";
import type {
	AnyMeetingInstanceUpdateData,
	DayOfWeekType,
	GDIDocument,
	Meeting,
	MeetingDocument,
	MeetingSeries,
	MeetingSeriesDocument,
	MeetingSeriesWriteData,
	Member,
	MemberDocument,
	MinistryAreaDocument,
	WeekOrdinalType,
} from "@/lib/types";

const MEETINGS_COLLECTION = "meetings";
const MEETING_SERIES_COLLECTION = "meeting-series";
const MEMBERS_COLLECTION = "members";
const GDIS_COLLECTION = "gdis";
const MINISTRY_AREAS_COLLECTION = "ministry-areas";
const ATTENDANCE_COLLECTION = "attendance";

// --- Helper to get a collection instance ---
async function getCollection(name: string): Promise<Collection> {
	return getCollectionDb(name);
}

// --- Date Calculation Helpers (preserved from original) ---
const dayOfWeekMapping: Record<DayOfWeekType, number> = {
	Sunday: 0,
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
};

function getNextWeeklyOccurrences(
	series: MeetingSeries,
	startDate: Date,
	count: number,
): Date[] {
	if (!series.weeklyDays || series.weeklyDays.length === 0) return [];
	const occurrences: Date[] = [];
	let currentDate = startOfDay(startDate);
	while (occurrences.length < count) {
		for (const dayStr of series.weeklyDays) {
			const targetDayNumber = dayOfWeekMapping[dayStr];
			let nextOccurrence = nextDay(currentDate, targetDayNumber as Day);
			if (
				isSameDay(nextOccurrence, currentDate) ||
				nextOccurrence < currentDate
			) {
				nextOccurrence = nextDay(
					addWeeks(currentDate, 1),
					targetDayNumber as Day,
				);
			}
			if (
				occurrences.length < count &&
				!occurrences.some((d) => isSameDay(d, nextOccurrence)) &&
				nextOccurrence >= startDate
			) {
				if (
					nextOccurrence > startDate ||
					(isSameDay(nextOccurrence, startDate) &&
						!occurrences.some((d) => isSameDay(d, nextOccurrence)))
				) {
					occurrences.push(startOfDay(nextOccurrence));
				}
			}
		}
		currentDate = addWeeks(currentDate, 1);
		currentDate = setDay(currentDate, 0, { weekStartsOn: 0 });
		occurrences.sort((a, b) => a.getTime() - b.getTime());
		if (occurrences.length >= count) break;
	}
	return occurrences.slice(0, count);
}

function getNextMonthlyOccurrences(
	series: MeetingSeries,
	startDate: Date,
	count: number,
): Date[] {
	const occurrences: Date[] = [];
	let currentMonthDate = startOfDay(
		new Date(startDate.getFullYear(), startDate.getMonth(), 1),
	);
	if (series.monthlyRuleType === "DayOfMonth" && series.monthlyDayOfMonth) {
		while (occurrences.length < count) {
			const dayInMonth = Math.min(
				series.monthlyDayOfMonth,
				getDaysInMonth(currentMonthDate),
			);
			let potentialDate = setDate(currentMonthDate, dayInMonth);
			potentialDate = startOfDay(potentialDate);
			if (
				potentialDate >= startDate &&
				!occurrences.some((d) => isSameDay(d, potentialDate))
			) {
				occurrences.push(potentialDate);
			}
			currentMonthDate = addMonths(currentMonthDate, 1);
		}
	} else if (
		series.monthlyRuleType === "DayOfWeekOfMonth" &&
		series.monthlyWeekOrdinal &&
		series.monthlyDayOfWeek
	) {
		const targetDayNumber = dayOfWeekMapping[series.monthlyDayOfWeek];
		const ordinalMap: Record<WeekOrdinalType, number> = {
			First: 1,
			Second: 2,
			Third: 3,
			Fourth: 4,
			Last: 5,
		};
		while (occurrences.length < count) {
			let potentialDate: Date | null = null;
			if (series.monthlyWeekOrdinal === "Last") {
				let testDate: Date | null = lastDayOfMonth(currentMonthDate);
				while (testDate && getDay(testDate) !== targetDayNumber) {
					testDate = setDate(testDate, getDate(testDate) - 1);
					if (testDate.getMonth() !== currentMonthDate.getMonth()) {
						testDate = null;
						break;
					}
				}
				potentialDate = testDate ? startOfDay(testDate) : null;
			} else {
				const ordinalNumber = ordinalMap[series.monthlyWeekOrdinal];
				const firstDayOfMonth = startOfDay(
					new Date(
						currentMonthDate.getFullYear(),
						currentMonthDate.getMonth(),
						1,
					),
				);
				let dayCount = 0;
				let dateInMonth = firstDayOfMonth;
				while (dateInMonth.getMonth() === firstDayOfMonth.getMonth()) {
					if (getDay(dateInMonth) === targetDayNumber) {
						dayCount++;
						if (dayCount === ordinalNumber) {
							potentialDate = startOfDay(dateInMonth);
							break;
						}
					}
					dateInMonth = setDate(dateInMonth, getDate(dateInMonth) + 1);
				}
			}
			if (
				potentialDate &&
				potentialDate >= startDate &&
				!occurrences.some((d) => isSameDay(d, potentialDate))
			) {
				occurrences.push(potentialDate);
			}
			currentMonthDate = addMonths(currentMonthDate, 1);
		}
	}
	return occurrences.slice(0, count);
}

// ============================================
// MEETING SERIES CRUD
// ============================================

export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
	return findDocuments<MeetingSeriesDocument>(MEETING_SERIES_COLLECTION);
}

export async function getMeetingSeriesById(
	id: string,
): Promise<MeetingSeries | null> {
	const oid = toObjectId(id);
	if (!oid) return null;
	return findOneDocument<MeetingSeriesDocument>(MEETING_SERIES_COLLECTION, {
		_id: oid,
	});
}

export async function addMeetingSeries(
	seriesData: MeetingSeriesWriteData,
): Promise<{ series: MeetingSeries; newInstances?: Meeting[] }> {
	// Convert string IDs to ObjectIds for storage
	const seriesDoc: Omit<MeetingSeriesDocument, "_id"> = {
		...seriesData,
		ownerGroupId: toObjectId(seriesData.ownerGroupId || null),
	};

	const newSeries = await insertOneDocument<MeetingSeriesDocument>(
		MEETING_SERIES_COLLECTION,
		seriesDoc,
	);
	const newInstances = await ensureFutureInstances(newSeries.id);

	return { series: newSeries, newInstances };
}

export async function updateMeetingSeries(
	seriesId: string,
	updates: Partial<MeetingSeriesWriteData>,
): Promise<{
	updatedSeries: MeetingSeries;
	newlyGeneratedInstances?: Meeting[];
}> {
	const seriesOid = toObjectId(seriesId);
	if (!seriesOid) throw new Error("Invalid MeetingSeries ID");

	// Convert string IDs to ObjectIds for storage
	const finalUpdates: any = { ...updates };
	if (updates.ownerGroupId !== undefined) {
		finalUpdates.ownerGroupId = toObjectId(updates.ownerGroupId);
	}

	const updatedSeries = await updateOneDocument<MeetingSeriesDocument>(
		MEETING_SERIES_COLLECTION,
		{ _id: seriesOid },
		{ $set: finalUpdates },
	);
	if (!updatedSeries)
		throw new Error(`MeetingSeries with ID ${seriesId} not found.`);

	const newlyGeneratedInstances = await ensureFutureInstances(updatedSeries.id);
	return { updatedSeries, newlyGeneratedInstances };
}

/**
 * Delete Meeting Series with transaction to ensure data consistency
 */
export async function deleteMeetingSeries(seriesId: string): Promise<boolean> {
	const seriesOid = toObjectId(seriesId);
	if (!seriesOid) throw new Error("Invalid MeetingSeries ID");

	return withTransaction(async (session) => {
		// 1. Find all meetings for this series
		const meetings = await findDocuments<MeetingDocument>(MEETINGS_COLLECTION, {
			seriesId: seriesOid,
		});
		const meetingOids = toObjectIds(meetings.map((m) => m.id));

		// 2. Delete all attendance records for these meetings
		if (meetingOids.length > 0) {
			const attendanceCollection = await getCollection(ATTENDANCE_COLLECTION);
			await attendanceCollection.deleteMany(
				{ meetingId: { $in: meetingOids } },
				{ session },
			);
		}

		// 3. Delete all meeting instances
		const meetingsCollection = await getCollection(MEETINGS_COLLECTION);
		await meetingsCollection.deleteMany({ seriesId: seriesOid }, { session });

		// 4. Delete the series itself
		return deleteOneDocument(
			MEETING_SERIES_COLLECTION,
			{ _id: seriesOid },
			{ session },
		);
	});
}

// ============================================
// MEETING INSTANCE CRUD
// ============================================

export async function getAllMeetings(): Promise<Meeting[]> {
	return findDocuments<MeetingDocument>(MEETINGS_COLLECTION) as Promise<
		Meeting[]
	>;
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
	const oid = toObjectId(id);
	if (!oid) return null;
	return findOneDocument<MeetingDocument>(MEETINGS_COLLECTION, {
		_id: oid,
	}) as Promise<Meeting | null>;
}

export async function getMeetingsBySeriesId(
	seriesId: string,
): Promise<Meeting[]> {
	const seriesOid = toObjectId(seriesId);
	if (!seriesOid) return [];

	await ensureFutureInstances(seriesId);
	return findDocuments<MeetingDocument>(
		MEETINGS_COLLECTION,
		{ seriesId: seriesOid },
		{ sort: { date: -1 } },
	) as Promise<Meeting[]>;
}

export async function getFilteredMeetingInstances(
	seriesIds: string[],
	startDate?: string,
	endDate?: string,
	page: number = 1,
	pageSize: number = 10,
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
	if (seriesIds && seriesIds.length > 0) {
		for (const seriesId of seriesIds) {
			await ensureFutureInstances(seriesId);
		}
	}

	const seriesOids = toObjectIds(seriesIds);
	const query: Filter<MeetingDocument> = {
		seriesId: { $in: seriesOids } as any,
	};
	if (startDate) query.date = { ...(query.date as any), $gte: startDate };
	if (endDate) query.date = { ...(query.date as any), $lte: endDate };

	const totalCount = await countDocuments(MEETINGS_COLLECTION, query);
	const totalPages = Math.ceil(totalCount / pageSize);
	const skip = (page - 1) * pageSize;

	const instances = (await findDocuments<MeetingDocument>(
		MEETINGS_COLLECTION,
		query,
		{ sort: { date: -1 }, skip, limit: pageSize },
	)) as Meeting[];

	return { instances, totalCount, totalPages };
}

export async function addMeetingInstance(
	seriesId: string,
	instanceDetails: Pick<
		Meeting,
		"name" | "date" | "time" | "location" | "description"
	>,
): Promise<Meeting> {
	const series = await getMeetingSeriesById(seriesId);
	if (!series) throw new Error(`MeetingSeries with ID ${seriesId} not found.`);

	const attendeeUids = (
		await getResolvedAttendeesForMeeting({ seriesId } as Meeting)
	).map((m) => m.id);
	const seriesOid = toObjectId(seriesId);
	const attendeeOids = toObjectIds(attendeeUids);

	if (!seriesOid) throw new Error("Invalid MeetingSeries ID");

	const newInstanceDoc: Omit<MeetingDocument, "_id"> = {
		seriesId: seriesOid,
		...instanceDetails,
		attendeeUids: attendeeOids,
		minute: null,
	};

	return insertOneDocument<MeetingDocument>(
		MEETINGS_COLLECTION,
		newInstanceDoc,
	) as Promise<Meeting>;
}

export async function updateMeeting(
	meetingId: string,
	updates: AnyMeetingInstanceUpdateData,
): Promise<Meeting | null> {
	const meetingOid = toObjectId(meetingId);
	if (!meetingOid) throw new Error("Invalid Meeting ID");

	return updateOneDocument<MeetingDocument>(
		MEETINGS_COLLECTION,
		{ _id: meetingOid },
		{ $set: updates },
	) as Promise<Meeting | null>;
}

export async function updateMeetingMinute(
	meetingId: string,
	minute: string | null,
): Promise<Meeting | null> {
	return updateMeeting(meetingId, { minute });
}

/**
 * Delete Meeting Instance with transaction to ensure data consistency
 */
export async function deleteMeetingInstance(instanceId: string): Promise<void> {
	const instanceOid = toObjectId(instanceId);
	if (!instanceOid) throw new Error("Invalid Meeting Instance ID");

	const instance = await getMeetingById(instanceId);
	if (!instance) return;

	const seriesOid = toObjectId(instance.seriesId);
	if (!seriesOid) throw new Error("Invalid MeetingSeries ID");

	await withTransaction(async (session) => {
		// 1. Mark this date as cancelled in the series
		await updateOneDocument(
			MEETING_SERIES_COLLECTION,
			{ _id: seriesOid },
			{ $addToSet: { cancelledDates: instance.date } as any },
			{ session },
		);

		// 2. Delete all attendance records for this meeting
		await (await getCollection(ATTENDANCE_COLLECTION)).deleteMany(
			{ meetingId: instanceOid },
			{ session },
		);

		// 3. Delete the meeting instance itself
		await deleteOneDocument(
			MEETINGS_COLLECTION,
			{ _id: instanceOid },
			{ session },
		);
	});
}

// ============================================
// CORE LOGIC FOR RECURRING MEETINGS & ATTENDEE RESOLUTION
// ============================================

export async function ensureFutureInstances(
	seriesId: string,
): Promise<Meeting[]> {
	const seriesOid = toObjectId(seriesId);
	if (!seriesOid) return [];

	const series = await getMeetingSeriesById(seriesId);
	if (!series || series.frequency === "OneTime") return [];

	const today = startOfDay(new Date());
	const instances = await findDocuments<MeetingDocument>(
		MEETINGS_COLLECTION,
		{ seriesId: seriesOid, date: { $gte: format(today, "yyyy-MM-dd") } },
		{ sort: { date: 1 } },
	);

	let instancesToGenerateCount = 0;
	if (series.frequency === "Weekly")
		instancesToGenerateCount = 4 - instances.length;
	else if (series.frequency === "Monthly")
		instancesToGenerateCount = 2 - instances.length;

	if (instancesToGenerateCount <= 0) return [];

	let startDateForNewGen = today;
	if (instances.length > 0) {
		startDateForNewGen = addDays(
			parseISO(instances[instances.length - 1].date),
			1,
		);
	}

	let newOccurrenceDates: Date[] = [];
	if (series.frequency === "Weekly")
		newOccurrenceDates = getNextWeeklyOccurrences(
			series,
			startDateForNewGen,
			instancesToGenerateCount,
		);
	else if (series.frequency === "Monthly")
		newOccurrenceDates = getNextMonthlyOccurrences(
			series,
			startDateForNewGen,
			instancesToGenerateCount,
		);

	const validDates = newOccurrenceDates.filter(
		(d) => !(series.cancelledDates || []).includes(format(d, "yyyy-MM-dd")),
	);
	if (validDates.length === 0) return [];

	const attendeeUids = (
		await getResolvedAttendeesForMeeting({ seriesId } as Meeting)
	).map((m) => m.id);
	const attendeeOids = toObjectIds(attendeeUids);

	const newInstanceDocs: Omit<MeetingDocument, "_id">[] = validDates.map(
		(date) => ({
			seriesId: seriesOid,
			name: `${series.name} (${format(date, "d MMM", { locale: es })})`,
			date: format(date, "yyyy-MM-dd"),
			time: series.defaultTime,
			location: series.defaultLocation,
			description: series.description,
			attendeeUids: attendeeOids,
			minute: null,
		}),
	);

	const meetingsCollection = await getCollection(MEETINGS_COLLECTION);
	await meetingsCollection.insertMany(newInstanceDocs as any[]);

	return findDocuments<MeetingDocument>(MEETINGS_COLLECTION, {
		seriesId: seriesOid,
		date: { $in: validDates.map((d) => format(d, "yyyy-MM-dd")) },
	}) as Promise<Meeting[]>;
}

export async function getResolvedAttendeesForMeeting(
	meeting: Pick<Meeting, "seriesId" | "attendeeUids">,
): Promise<Member[]> {
	const series = await getMeetingSeriesById(meeting.seriesId);
	if (!series) return [];

	const memberIds = new Set<string>();

	if (series.seriesType === "general") {
		if (series.targetAttendeeGroups.includes("allMembers"))
			return findDocuments<MemberDocument>(MEMBERS_COLLECTION);
		// Complex role-based logic
		const leaders = await findDocuments<MemberDocument>(MEMBERS_COLLECTION, {
			$or: [{ roles: "Leader" }, { roles: "Worker" }],
		});
		leaders.forEach((l) => memberIds.add(l.id));
	} else if (series.seriesType === "gdi" && series.ownerGroupId) {
		const ownerOid = toObjectId(series.ownerGroupId);
		if (ownerOid) {
			const gdi = await findOneDocument<GDIDocument>(GDIS_COLLECTION, {
				_id: ownerOid,
			});
			if (gdi) {
				if (gdi.guideId) memberIds.add(gdi.guideId);
				gdi.memberIds?.forEach((id) => memberIds.add(id));
			}
		}
	} else if (series.seriesType === "ministryArea" && series.ownerGroupId) {
		const ownerOid = toObjectId(series.ownerGroupId);
		if (ownerOid) {
			const area = await findOneDocument<MinistryAreaDocument>(
				MINISTRY_AREAS_COLLECTION,
				{ _id: ownerOid },
			);
			if (area) {
				if (area.leaderId) memberIds.add(area.leaderId);
				area.memberIds?.forEach((id) => memberIds.add(id));
			}
		}
	} else if (meeting.attendeeUids) {
		meeting.attendeeUids.forEach((id) => memberIds.add(id));
	}

	if (memberIds.size === 0) return [];
	const memberOids = toObjectIds(Array.from(memberIds));
	return findDocuments<MemberDocument>(MEMBERS_COLLECTION, {
		_id: { $in: memberOids } as any,
	});
}
