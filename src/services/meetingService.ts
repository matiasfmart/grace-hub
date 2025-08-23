'use server';
import type { Meeting, MeetingWriteData, MeetingSeries, MeetingSeriesWriteData, Member, GDI, MinistryArea, MeetingTargetRoleType, DayOfWeekType, WeekOrdinalType, AnyMeetingInstanceUpdateData } from '@/lib/types';
import { findDocuments, findOneDocument, insertOneDocument, updateOneDocument, deleteOneDocument, countDocuments, updateManyDocuments, getCollection as getCollectionDb } from '@/lib/db-utils';
import { format, parseISO, addWeeks, setDay, addMonths, setDate, getDate, getDaysInMonth, lastDayOfMonth, startOfDay, isSameDay, nextDay, getDay, isValid as isValidDateFn, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Collection, Filter, ObjectId } from 'mongodb';

const MEETINGS_COLLECTION = 'meetings';
const MEETING_SERIES_COLLECTION = 'meeting-series';
const MEMBERS_COLLECTION = 'members';
const GDIS_COLLECTION = 'gdis';
const MINISTRY_AREAS_COLLECTION = 'ministry-areas';
const ATTENDANCE_COLLECTION = 'attendance';

// --- Helper to get a collection instance ---
async function getCollection(name: string): Promise<Collection> {
    return getCollectionDb(name);
}

// --- Date Calculation Helpers (preserved from original) ---
const dayOfWeekMapping: Record<DayOfWeekType, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function getNextWeeklyOccurrences(series: MeetingSeries, startDate: Date, count: number): Date[] {
    if (!series.weeklyDays || series.weeklyDays.length === 0) return [];
    const occurrences: Date[] = [];
    let currentDate = startOfDay(startDate);
    while (occurrences.length < count) {
        for (const dayStr of series.weeklyDays) {
            const targetDayNumber = dayOfWeekMapping[dayStr];
            let nextOccurrence = nextDay(currentDate, targetDayNumber as Day);
            if (isSameDay(nextOccurrence, currentDate) || nextOccurrence < currentDate) {
                 nextOccurrence = nextDay(addWeeks(currentDate,1), targetDayNumber as Day);
            }
            if (occurrences.length < count && !occurrences.some(d => isSameDay(d, nextOccurrence)) && nextOccurrence >= startDate) {
                 if(nextOccurrence > startDate || (isSameDay(nextOccurrence, startDate) && !occurrences.some(d => isSameDay(d,nextOccurrence)))) {
                    occurrences.push(startOfDay(nextOccurrence));
                 }
            }
        }
        currentDate = addWeeks(currentDate, 1);
        currentDate = setDay(currentDate, 0, { weekStartsOn: 0 });
        occurrences.sort((a,b) => a.getTime() - b.getTime());
         if (occurrences.length >= count) break;
    }
    return occurrences.slice(0, count);
}

function getNextMonthlyOccurrences(series: MeetingSeries, startDate: Date, count: number): Date[] {
    const occurrences: Date[] = [];
    let currentMonthDate = startOfDay(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
    if (series.monthlyRuleType === 'DayOfMonth' && series.monthlyDayOfMonth) {
        while (occurrences.length < count) {
            const dayInMonth = Math.min(series.monthlyDayOfMonth, getDaysInMonth(currentMonthDate));
            let potentialDate = setDate(currentMonthDate, dayInMonth);
            potentialDate = startOfDay(potentialDate);
            if (potentialDate >= startDate && !occurrences.some(d => isSameDay(d, potentialDate))) {
                occurrences.push(potentialDate);
            }
            currentMonthDate = addMonths(currentMonthDate, 1);
        }
    } else if (series.monthlyRuleType === 'DayOfWeekOfMonth' && series.monthlyWeekOrdinal && series.monthlyDayOfWeek) {
        const targetDayNumber = dayOfWeekMapping[series.monthlyDayOfWeek];
        const ordinalMap: Record<WeekOrdinalType, number> = { First: 1, Second: 2, Third: 3, Fourth: 4, Last: 5 };
        while (occurrences.length < count) {
            let potentialDate: Date | null = null;
            if (series.monthlyWeekOrdinal === 'Last') {
                let testDate = lastDayOfMonth(currentMonthDate);
                while(getDay(testDate) !== targetDayNumber) {
                    testDate = setDate(testDate, getDate(testDate) - 1);
                    if(testDate.getMonth() !== currentMonthDate.getMonth()) { testDate = null; break; }
                }
                potentialDate = testDate ? startOfDay(testDate) : null;
            } else {
                const ordinalNumber = ordinalMap[series.monthlyWeekOrdinal];
                let firstDayOfMonth = startOfDay(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1));
                let dayCount = 0;
                let dateInMonth = firstDayOfMonth;
                while(dateInMonth.getMonth() === firstDayOfMonth.getMonth()){
                    if(getDay(dateInMonth) === targetDayNumber){
                        dayCount++;
                        if(dayCount === ordinalNumber){ potentialDate = startOfDay(dateInMonth); break; }
                    }
                    dateInMonth = setDate(dateInMonth, getDate(dateInMonth) + 1 );
                }
            }
            if (potentialDate && potentialDate >= startDate && !occurrences.some(d => isSameDay(d, potentialDate))) {
                occurrences.push(potentialDate);
            }
            currentMonthDate = addMonths(currentMonthDate, 1);
        }
    }
    return occurrences.slice(0, count);
}

// --- Meeting Series CRUD ---

export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
  return findDocuments<MeetingSeries>(MEETING_SERIES_COLLECTION);
}

export async function getMeetingSeriesById(id: string): Promise<MeetingSeries | null> {
  return findOneDocument<MeetingSeries>(MEETING_SERIES_COLLECTION, { _id: new ObjectId(id) });
}

export async function addMeetingSeries(seriesData: MeetingSeriesWriteData): Promise<{ series: MeetingSeries; newInstances?: Meeting[] }> {
  const newSeries = await insertOneDocument<MeetingSeries>(MEETING_SERIES_COLLECTION, seriesData);
  const newInstances = await ensureFutureInstances(newSeries.id);

  return { series: newSeries, newInstances };
}

export async function updateMeetingSeries(seriesId: string, updates: Partial<MeetingSeriesWriteData>): Promise<{ updatedSeries: MeetingSeries; newlyGeneratedInstances?: Meeting[] }> {
  const updatedSeries = await updateOneDocument<MeetingSeries>(MEETING_SERIES_COLLECTION, { _id: new ObjectId(seriesId) }, { $set: updates });
  if (!updatedSeries) throw new Error(`MeetingSeries with ID ${seriesId} not found.`);

  const newlyGeneratedInstances = await ensureFutureInstances(updatedSeries.id);
  return { updatedSeries, newlyGeneratedInstances };
}

export async function deleteMeetingSeries(seriesId: string): Promise<boolean> {
  const meetings = await findDocuments<Meeting>(MEETINGS_COLLECTION, { seriesId });
  const meetingIds = meetings.map(m => new ObjectId(m.id));

  if (meetingIds.length > 0) {
    const attendanceCollection = await getCollection(ATTENDANCE_COLLECTION);
    await attendanceCollection.deleteMany({ meetingId: { $in: meetingIds } });
  }

  const meetingsCollection = await getCollection(MEETINGS_COLLECTION);
  await meetingsCollection.deleteMany({ seriesId: new ObjectId(seriesId) });

  return deleteOneDocument(MEETING_SERIES_COLLECTION, { _id: new ObjectId(seriesId) });
}

// --- Meeting Instance CRUD ---

export async function getAllMeetings(): Promise<Meeting[]> {
    return findDocuments<Meeting>(MEETINGS_COLLECTION);
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  return findOneDocument<Meeting>(MEETINGS_COLLECTION, { _id: new ObjectId(id) });
}

export async function getMeetingsBySeriesId(seriesId: string): Promise<Meeting[]> {
    await ensureFutureInstances(seriesId);
    return findDocuments<Meeting>(MEETINGS_COLLECTION, { seriesId: new ObjectId(seriesId) }, { sort: { date: -1 } });
}

export async function getFilteredMeetingInstances(seriesIds: string[], startDate?: string, endDate?: string, page: number = 1, pageSize: number = 10): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
    if (seriesIds && seriesIds.length > 0) {
        for (const seriesId of seriesIds) {
            await ensureFutureInstances(seriesId);
        }
    }

    const query: Filter<Meeting> = { seriesId: { $in: seriesIds.map(id => new ObjectId(id)) } };
    if (startDate) query.date = { ...query.date, $gte: startDate };
    if (endDate) query.date = { ...query.date, $lte: endDate };

    const totalCount = await countDocuments(MEETINGS_COLLECTION, query);
    const totalPages = Math.ceil(totalCount / pageSize);
    const skip = (page - 1) * pageSize;

    const instances = await findDocuments<Meeting>(MEETINGS_COLLECTION, query, { sort: { date: -1 }, skip, limit: pageSize });

    return { instances, totalCount, totalPages };
}

export async function addMeetingInstance(seriesId: string, instanceDetails: Pick<Meeting, 'name' | 'date' | 'time' | 'location' | 'description'>): Promise<Meeting> {
    const series = await getMeetingSeriesById(seriesId);
    if (!series) throw new Error(`MeetingSeries with ID ${seriesId} not found.`);

    const attendeeUids = (await getResolvedAttendeesForMeeting({ seriesId } as Meeting)).map(m => m.id);

    const newInstanceData: MeetingWriteData = {
        seriesId,
        ...instanceDetails,
        attendeeUids,
        minute: null,
    };

    return insertOneDocument<Meeting>(MEETINGS_COLLECTION, newInstanceData);
}

export async function updateMeeting(meetingId: string, updates: AnyMeetingInstanceUpdateData): Promise<Meeting | null> {
  return updateOneDocument<Meeting>(MEETINGS_COLLECTION, { _id: new ObjectId(meetingId) }, { $set: updates });
}

export async function updateMeetingMinute(meetingId: string, minute: string | null): Promise<Meeting | null> {
    return updateMeeting(meetingId, { minute });
}

export async function deleteMeetingInstance(instanceId: string): Promise<void> {
    const instance = await getMeetingById(instanceId);
    if (!instance) return;

    await updateOneDocument(
        MEETING_SERIES_COLLECTION, 
        { _id: new ObjectId(instance.seriesId) }, 
        { $addToSet: { cancelledDates: instance.date } as any }
    );

    await deleteOneDocument(MEETINGS_COLLECTION, { _id: new ObjectId(instanceId) });
    await (await getCollection(ATTENDANCE_COLLECTION)).deleteMany({ meetingId: new ObjectId(instanceId) });
}

// --- Core Logic for Recurring Meetings & Attendee Resolution ---

export async function ensureFutureInstances(seriesId: string): Promise<Meeting[]> {
    const series = await getMeetingSeriesById(seriesId);
    if (!series || series.frequency === "OneTime") return [];

    const today = startOfDay(new Date());
    const instances = await findDocuments<Meeting>(MEETINGS_COLLECTION, { seriesId: new ObjectId(seriesId), date: { $gte: format(today, 'yyyy-MM-dd') } }, { sort: { date: 1 } });

    let instancesToGenerateCount = 0;
    if (series.frequency === "Weekly") instancesToGenerateCount = 4 - instances.length;
    else if (series.frequency === "Monthly") instancesToGenerateCount = 2 - instances.length;

    if (instancesToGenerateCount <= 0) return [];

    let startDateForNewGen = today;
    if (instances.length > 0) {
        startDateForNewGen = addDays(parseISO(instances[instances.length - 1].date), 1);
    }

    let newOccurrenceDates: Date[] = [];
    if (series.frequency === "Weekly") newOccurrenceDates = getNextWeeklyOccurrences(series, startDateForNewGen, instancesToGenerateCount);
    else if (series.frequency === "Monthly") newOccurrenceDates = getNextMonthlyOccurrences(series, startDateForNewGen, instancesToGenerateCount);

    const validDates = newOccurrenceDates.filter(d => !(series.cancelledDates || []).includes(format(d, 'yyyy-MM-dd')));
    if (validDates.length === 0) return [];

    const attendeeUids = (await getResolvedAttendeesForMeeting({ seriesId } as Meeting)).map(m => m.id);
    
    const newInstances: MeetingWriteData[] = validDates.map(date => ({
        seriesId: series.id,
        name: `${series.name} (${format(date, 'd MMM', { locale: es })})`,
        date: format(date, 'yyyy-MM-dd'),
        time: series.defaultTime,
        location: series.defaultLocation,
        description: series.description,
        attendeeUids,
        minute: null,
    }));

    const meetingsCollection = await getCollection(MEETINGS_COLLECTION);
    await meetingsCollection.insertMany(newInstances as any[]);

    return findDocuments<Meeting>(MEETINGS_COLLECTION, { seriesId: new ObjectId(seriesId), date: { $in: validDates.map(d => format(d, 'yyyy-MM-dd')) } });
}

export async function getResolvedAttendeesForMeeting(meeting: Pick<Meeting, 'seriesId' | 'attendeeUids'>): Promise<Member[]> {
    const series = await getMeetingSeriesById(meeting.seriesId);
    if (!series) return [];

    let memberIds = new Set<string>();

    if (series.seriesType === 'general') {
        if (series.targetAttendeeGroups.includes("allMembers")) return findDocuments<Member>(MEMBERS_COLLECTION);
        // Complex role-based logic
        const leaders = await findDocuments<Member>(MEMBERS_COLLECTION, { $or: [{ 'roles': 'Leader' }, { 'roles': 'Worker' }] });
        leaders.forEach(l => memberIds.add(l.id));

    } else if (series.seriesType === 'gdi' && series.ownerGroupId) {
        const gdi = await findOneDocument<GDI>(GDIS_COLLECTION, { _id: new ObjectId(series.ownerGroupId) });
        if (gdi) {
            if (gdi.guideId) memberIds.add(gdi.guideId);
            gdi.memberIds.forEach(id => memberIds.add(id));
        }
    } else if (series.seriesType === 'ministryArea' && series.ownerGroupId) {
        const area = await findOneDocument<MinistryArea>(MINISTRY_AREAS_COLLECTION, { _id: new ObjectId(series.ownerGroupId) });
        if (area) {
            if (area.leaderId) memberIds.add(area.leaderId);
            area.memberIds.forEach(id => memberIds.add(id));
        }
    } else if (meeting.attendeeUids) {
        meeting.attendeeUids.forEach(id => memberIds.add(id));
    }

    if (memberIds.size === 0) return [];
    return findDocuments<Member>(MEMBERS_COLLECTION, { _id: { $in: Array.from(memberIds).map(id => new ObjectId(id)) } });
}