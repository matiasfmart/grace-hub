/**
 * Group Meetings Service
 *
 * Service for managing meetings associated with groups (GDIs and Ministry Areas).
 * 
 * NOTE: This is a compatibility layer. The backend doesn't fully support
 * meeting series with groups yet. Functions will emit warnings and return
 * empty/stub data where backend support is missing.
 */

import { meetingsService, getAllMeetings } from './meetingsService';
import type { Meeting, MeetingSeries, MeetingSeriesType } from '@/lib/types';

// ==============================================
// GROUP MEETING SERIES FUNCTIONS
// ==============================================

/**
 * Get meeting series for a group
 * Note: Backend doesn't support series yet
 */
export async function getSeriesForGroup(
  _groupType: 'gdi' | 'ministryArea',
  _groupId: string
): Promise<MeetingSeries[]> {
  console.warn('getSeriesForGroup: Backend does not support meeting series yet');
  return [];
}

/**
 * Get series by ID for group
 */
export async function getSeriesByIdForGroup(
  _groupType: 'gdi' | 'ministryArea',
  _groupId: string,
  _seriesId: string
): Promise<MeetingSeries | null> {
  console.warn('getSeriesByIdForGroup: Backend does not support meeting series yet');
  return null;
}

/**
 * Add meeting series for group
 */
export async function addMeetingSeriesForGroup(
  _groupType: MeetingSeriesType,
  _groupId: string,
  _seriesData: unknown
): Promise<{ series: MeetingSeries; message: string; newInstances?: Meeting[] }> {
  throw new Error('addMeetingSeriesForGroup: Backend does not support meeting series yet. Create individual meetings instead.');
}

/**
 * Update meeting series for group
 */
export async function updateMeetingSeriesForGroup(
  _groupType: 'gdi' | 'ministryArea',
  _groupId: string,
  _seriesId: string,
  _updates: unknown
): Promise<{ updatedSeries: MeetingSeries; newlyGeneratedInstances?: Meeting[]; message: string }> {
  throw new Error('updateMeetingSeriesForGroup: Backend does not support meeting series yet');
}

/**
 * Delete meeting series for group
 * Note: Accepts 1 argument (seriesId) for backward compatibility
 */
export async function deleteMeetingSeriesForGroup(
  seriesId: string,
  _groupType?: 'gdi' | 'ministryArea',
  _groupId?: string
): Promise<void> {
  console.warn('deleteMeetingSeriesForGroup: Backend does not support meeting series yet');
  // No-op - series don't exist
}

// ==============================================
// GROUP MEETING INSTANCE FUNCTIONS
// ==============================================

/**
 * Get meeting instances for a group
 * Returns all meetings of the specified type
 */
export async function getInstancesForGroup(
  groupType: 'gdi' | 'ministryArea',
  _groupId: string,
  _seriesId?: string
): Promise<Meeting[]> {
  try {
    return await meetingsService.getByType(groupType);
  } catch {
    return [];
  }
}

/**
 * Get group meeting instances (with pagination support)
 */
export async function getGroupMeetingInstances(
  groupType: 'gdi' | 'ministryArea',
  groupId: string,
  filterSeriesId?: string,
  startDate?: string,
  endDate?: string,
  _page: number = 1,
  _pageSize: number = 10
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
  let meetings: Meeting[];
  
  if (startDate && endDate) {
    meetings = await meetingsService.getByDateRange(startDate, endDate);
  } else {
    try {
      meetings = await meetingsService.getByType(groupType);
    } catch {
      meetings = [];
    }
  }
  
  // Note: Series filtering is not supported in new architecture
  if (filterSeriesId && filterSeriesId !== 'all') {
    console.warn('getGroupMeetingInstances: Series filtering is not supported in new architecture');
  }
  
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
  let meetings: Meeting[];
  
  if (startDate && endDate) {
    meetings = await meetingsService.getByDateRange(startDate, endDate);
  } else {
    meetings = await getAllMeetings();
  }
  
  // Note: seriesIds filtering is not supported in the new architecture
  // since meetings don't have series
  if (seriesIds && seriesIds.length > 0) {
    console.warn('getFilteredMeetingInstances: Series filtering is not supported in new architecture');
  }
  
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
  groupType: MeetingSeriesType,
  _groupId: string,
  _seriesId: string,
  meetingData: { name: string; date: string | Date; time: string; location?: string; description?: string }
): Promise<Meeting> {
  const dateString = meetingData.date instanceof Date 
    ? meetingData.date.toISOString().split('T')[0]
    : meetingData.date;
    
  return meetingsService.create(
    {
      seriesId: '',
      name: meetingData.name,
      date: dateString,
      time: meetingData.time,
      location: meetingData.location || '',
    },
    groupType
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
