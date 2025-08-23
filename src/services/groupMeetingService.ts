'use server';
import type { Meeting, MeetingSeries, DefineMeetingSeriesFormValues, MeetingInstanceFormValues, MeetingSeriesType, AnyMeetingInstanceUpdateData } from '@/lib/types';
import { format, parseISO, isValid as isValidDateFn } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getMeetingSeriesById as getCoreMeetingSeriesById,
  addMeetingSeries as addCoreMeetingSeries,
  updateMeetingSeries as updateCoreMeetingSeries,
  deleteMeetingSeries as deleteCoreMeetingSeries,
  getMeetingById as getCoreMeetingById,
  addMeetingInstance as addCoreMeetingInstance,
  updateMeeting as updateCoreMeeting,
  deleteMeetingInstance as deleteCoreMeetingInstance,
  getFilteredMeetingInstances as getCoreFilteredMeetingInstances,
} from './meetingService';
import { findDocuments, deleteOneDocument } from '@/lib/db-utils';
import { ObjectId } from 'mongodb';

// --- Group Meeting Series Actions ---

export async function getSeriesForGroup(groupType: 'gdi' | 'ministryArea', groupId: string): Promise<MeetingSeries[]> {
  return findDocuments<MeetingSeries>('meeting-series', { seriesType: groupType, ownerGroupId: groupId });
}

export async function getSeriesByIdForGroup(groupType: 'gdi' | 'ministryArea', groupId: string, seriesId: string): Promise<MeetingSeries | null> {
    const series = await getCoreMeetingSeriesById(seriesId);
    if (series && series.seriesType === groupType && series.ownerGroupId === groupId) {
        return series;
    }
    return null;
}

export async function addMeetingSeriesForGroup(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesData: DefineMeetingSeriesFormValues
): Promise<{ series: MeetingSeries; message: string; newInstances?: Meeting[] }> {
  if (groupType !== 'gdi' && groupType !== 'ministryArea') {
    throw new Error('Invalid group type for series creation.');
  }

  const seriesDataForCore: Omit<MeetingSeries, 'id' | 'cancelledDates'> = {
    name: seriesData.name,
    description: seriesData.description,
    defaultTime: seriesData.defaultTime,
    defaultLocation: seriesData.defaultLocation,
    seriesType: groupType,
    ownerGroupId: groupId,
    targetAttendeeGroups: ['allMembers'], // Group members are resolved dynamically
    frequency: seriesData.frequency,
    oneTimeDate: seriesData.frequency === "OneTime" ? format(seriesData.oneTimeDate as Date, 'yyyy-MM-dd') : undefined,
    weeklyDays: seriesData.frequency === "Weekly" ? seriesData.weeklyDays : undefined,
    monthlyRuleType: seriesData.frequency === "Monthly" ? seriesData.monthlyRuleType : undefined,
    monthlyDayOfMonth: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfMonth" ? seriesData.monthlyDayOfMonth : undefined,
    monthlyWeekOrdinal: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyWeekOrdinal : undefined,
    monthlyDayOfWeek: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyDayOfWeek : undefined,
  };

  const { series, newInstances } = await addCoreMeetingSeries(seriesDataForCore as MeetingSeriesWriteData);
  const message = `Serie de reuniones "${series.name}" agregada exitosamente.`;
  return { series, message, newInstances };
}

export async function updateMeetingSeriesForGroup(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesId: string,
  updatedData: DefineMeetingSeriesFormValues
): Promise<{ updatedSeries: MeetingSeries; message: string; newlyGeneratedInstances?: Meeting[] }> {
  const seriesToUpdate = await getCoreMeetingSeriesById(seriesId);
  if (!seriesToUpdate || seriesToUpdate.ownerGroupId !== groupId || seriesToUpdate.seriesType !== groupType) {
    throw new Error('Serie no encontrada o no pertenece a este grupo.');
  }

  const { updatedSeries, newlyGeneratedInstances } = await updateCoreMeetingSeries(seriesId, updatedData as any);
  const message = `Serie de reuniones "${updatedSeries.name}" actualizada exitosamente.`;
  return { updatedSeries, message, newlyGeneratedInstances };
}

export async function deleteMeetingSeriesForGroup(groupId: string): Promise<void> {
    const allSeriesForGroup = await findDocuments<MeetingSeries>('meeting-series', { ownerGroupId: groupId });
    for (const series of allSeriesForGroup) {
        await deleteCoreMeetingSeries(series.id);
    }
}

// --- Group Meeting Instance Actions ---

export async function getGroupMeetingInstances(
    groupType: 'gdi' | 'ministryArea',
    groupId: string,
    filterSeriesId?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
    const groupSeriesList = await getSeriesForGroup(groupType, groupId);
    const groupSeriesIds = groupSeriesList.map(s => s.id);

    let targetSeriesIds: string[] = [];
    if (filterSeriesId && filterSeriesId !== 'all') {
        if (groupSeriesIds.includes(filterSeriesId)) {
            targetSeriesIds = [filterSeriesId];
        } else {
            return { instances: [], totalCount: 0, totalPages: 0 };
        }
    } else {
        targetSeriesIds = groupSeriesIds;
    }

    return getCoreFilteredMeetingInstances(targetSeriesIds, startDate, endDate, page, pageSize);
}

export async function addMeetingInstanceForGroup(
  groupType: 'gdi' | 'ministryArea',
  groupId: string,
  seriesId: string,
  instanceDetails: MeetingInstanceFormValues
): Promise<Meeting> {
  const series = await getCoreMeetingSeriesById(seriesId);
  if (!series || series.seriesType !== groupType || series.ownerGroupId !== groupId) {
    throw new Error(`Serie no encontrada o no pertenece a este grupo.`);
  }

  const meetingData: Pick<Meeting, 'name' | 'date' | 'time' | 'location' | 'description'> = {
    name: instanceDetails.name,
    date: format(instanceDetails.date, 'yyyy-MM-dd'),
    time: instanceDetails.time,
    location: instanceDetails.location,
    description: instanceDetails.description,
  };

  return addCoreMeetingInstance(seriesId, meetingData);
}

export async function updateMeetingInstanceForGroup(
  instanceId: string,
  updates: AnyMeetingInstanceUpdateData
): Promise<Meeting | null> {
  // Security check can be enhanced here to ensure user has rights to update
  return updateCoreMeeting(instanceId, updates);
}

export async function updateMeetingInstanceMinuteForGroup(instanceId: string, minute: string | null): Promise<Meeting | null> {
    return updateMeetingInstanceForGroup(instanceId, { minute });
}

export async function deleteMeetingInstanceForGroup(instanceId: string): Promise<void> {
  // Security check can be enhanced here
  await deleteCoreMeetingInstance(instanceId);
}