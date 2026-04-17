/**
 * Group Meetings Service
 *
 * Service for managing meetings associated with groups (GDIs and Ministry Areas).
 */

import { meetingsService, getAllMeetings } from './meetingsService';
import { meetingSeriesEndpoint } from '../endpoints/meetingSeriesEndpoint';
import {
  mapApiMeetingSeriesToMeetingSeries,
  mapApiMeetingSeriesArrayToMeetingSeriesArray,
  mapFormValuesToApiCreateRequest,
} from '../mappers/meetingSeriesMapper';
import type { Meeting, MeetingSeries, MeetingSeriesType, DefineMeetingSeriesFormValues } from '@/lib/types';

// ==============================================
// GROUP MEETING SERIES FUNCTIONS
// ==============================================

/**
 * Get meeting series for a group
 */
export async function getSeriesForGroup(
  groupType: 'gdi' | 'ministryArea',
  groupId: string
): Promise<MeetingSeries[]> {
  try {
    const numericId = parseInt(groupId, 10);
    const apiSeries = groupType === 'gdi'
      ? await meetingSeriesEndpoint.getByGdiId(numericId)
      : await meetingSeriesEndpoint.getByAreaId(numericId);
    return mapApiMeetingSeriesArrayToMeetingSeriesArray(apiSeries);
  } catch (error) {
    console.error('getSeriesForGroup error:', error);
    return [];
  }
}

/**
 * Get series by ID for group
 */
export async function getSeriesByIdForGroup(
  _groupType: 'gdi' | 'ministryArea',
  _groupId: string,
  seriesId: string
): Promise<MeetingSeries | null> {
  try {
    const numericId = parseInt(seriesId, 10);
    const apiSeries = await meetingSeriesEndpoint.getById(numericId);
    return mapApiMeetingSeriesToMeetingSeries(apiSeries);
  } catch {
    return null;
  }
}

/**
 * Add meeting series for group
 */
export async function addMeetingSeriesForGroup(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesData: DefineMeetingSeriesFormValues
): Promise<{ series: MeetingSeries; message: string; newInstances?: Meeting[] }> {
  const request = mapFormValuesToApiCreateRequest(groupType, groupId, seriesData);
  const apiResponse = await meetingSeriesEndpoint.create(request);
  const series = mapApiMeetingSeriesToMeetingSeries(apiResponse);

  return {
    series,
    message: `Serie de reunión "${series.name}" creada exitosamente`,
    newInstances: [], // Backend doesn't auto-generate instances yet
  };
}

/**
 * Update meeting series for group
 * NOTE: Backend doesn't support update yet - TODO: implement when backend supports it
 */
export async function updateMeetingSeriesForGroup(
  _groupType: 'gdi' | 'ministryArea',
  _groupId: string,
  _seriesId: string,
  _updates: unknown
): Promise<{ updatedSeries: MeetingSeries; newlyGeneratedInstances?: Meeting[]; message: string }> {
  throw new Error('updateMeetingSeriesForGroup: Backend update endpoint not implemented yet');
}

/**
 * Delete meeting series for group
 */
export async function deleteMeetingSeriesForGroup(
  seriesId: string,
  _groupType?: 'gdi' | 'ministryArea',
  _groupId?: string
): Promise<void> {
  const numericId = parseInt(seriesId, 10);
  await meetingSeriesEndpoint.delete(numericId);
}

// ==============================================
// GROUP MEETING INSTANCE FUNCTIONS
// ==============================================

/**
 * Get meeting instances for a group
 * Returns meetings filtered by seriesId if provided
 */
export async function getInstancesForGroup(
  _groupType: 'gdi' | 'ministryArea',
  _groupId: string,
  seriesId?: string
): Promise<Meeting[]> {
  try {
    if (seriesId) {
      return await meetingsService.getBySeriesId(seriesId);
    }
    return await meetingsService.getAll();
  } catch {
    return [];
  }
}

/**
 * Get group meeting instances (with pagination support)
 */
export async function getGroupMeetingInstances(
  _groupType: 'gdi' | 'ministryArea',
  _groupId: string,
  filterSeriesId?: string,
  startDate?: string,
  endDate?: string,
  _page: number = 1,
  _pageSize: number = 10
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
  let meetings: Meeting[];
  
  // Use filters to get meetings
  const filters: { seriesId?: string; startDate?: string; endDate?: string } = {};
  if (filterSeriesId && filterSeriesId !== 'all') {
    filters.seriesId = filterSeriesId;
  }
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  
  meetings = await meetingsService.getWithFilters(filters);
  
  return {
    instances: meetings,
    totalCount: meetings.length,
    totalPages: 1,
  };
}

/**
 * Get filtered meeting instances
 */
export async function getFilteredMeetingInstances(
  seriesIds: string[],
  startDate?: string,
  endDate?: string,
  _page: number = 1,
  _pageSize: number = 10
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
  // If single series, use filter endpoint
  if (seriesIds.length === 1) {
    const meetings = await meetingsService.getWithFilters({
      seriesId: seriesIds[0],
      startDate,
      endDate,
    });
    return {
      instances: meetings,
      totalCount: meetings.length,
      totalPages: 1,
    };
  }
  
  // For multiple series, fetch each and combine
  if (seriesIds.length > 1) {
    const allMeetings: Meeting[] = [];
    for (const seriesId of seriesIds) {
      const meetings = await meetingsService.getWithFilters({
        seriesId,
        startDate,
        endDate,
      });
      allMeetings.push(...meetings);
    }
    return {
      instances: allMeetings,
      totalCount: allMeetings.length,
      totalPages: 1,
    };
  }
  
  // No series filter - get all with date range
  const meetings = await meetingsService.getWithFilters({ startDate, endDate });
  return {
    instances: meetings,
    totalCount: meetings.length,
    totalPages: 1,
  };
}

/**
 * Add meeting instance for group
 */
export async function addMeetingInstanceForGroup(
  _groupType: MeetingSeriesType,
  _groupId: string,
  seriesId: string,
  meetingData: { name: string; date: string | Date; time: string; location?: string; description?: string }
): Promise<Meeting> {
  const dateString = meetingData.date instanceof Date 
    ? meetingData.date.toISOString().split('T')[0]
    : meetingData.date;
    
  return meetingsService.create(
    seriesId,
    {
      seriesId,
      name: meetingData.name,
      date: dateString,
      time: meetingData.time,
      location: meetingData.location || '',
    }
  );
}

/**
 * Update meeting instance for group
 * Note: Accepts 2 arguments (meetingId, updates) for backward compatibility
 */
export async function updateMeetingInstanceForGroup(
  meetingId: string,
  updates: Partial<{ name: string; date: string; time: string; location: string; description: string }>
): Promise<Meeting | null> {
  try {
    return await meetingsService.update(meetingId, updates);
  } catch {
    return null;
  }
}

/**
 * Update meeting instance minute for group
 * Note: Accepts 2 arguments (meetingId, minute) for backward compatibility
 */
export async function updateMeetingInstanceMinuteForGroup(
  meetingId: string,
  minute: string | null
): Promise<Meeting | null> {
  try {
    return await meetingsService.update(meetingId, { minute: minute ?? undefined });
  } catch {
    return null;
  }
}

/**
 * Delete meeting instance for group
 * Note: Accepts 1 argument (meetingId) for backward compatibility
 */
export async function deleteMeetingInstanceForGroup(
  meetingId: string
): Promise<void> {
  await meetingsService.delete(meetingId);
}

export default {
  getSeriesForGroup,
  getSeriesByIdForGroup,
  addMeetingSeriesForGroup,
  updateMeetingSeriesForGroup,
  deleteMeetingSeriesForGroup,
  getInstancesForGroup,
  getGroupMeetingInstances,
  getFilteredMeetingInstances,
  addMeetingInstanceForGroup,
  updateMeetingInstanceForGroup,
  updateMeetingInstanceMinuteForGroup,
  deleteMeetingInstanceForGroup,
};
