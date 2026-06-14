/**
 * Meetings Service
 *
 * Orchestrates API calls and mapping for meeting operations.
 */

import { meetingsEndpoint } from '../endpoints';
import { meetingSeriesEndpoint } from '../endpoints/meetingSeriesEndpoint';
import {
  mapApiMeetingToMeeting,
  mapApiMeetingsToMeetings,
  mapMeetingToApiCreateRequest,
  mapMeetingToApiUpdateRequest,
  mapApiMeetingSeriesToMeetingSeries,
  mapApiMeetingSeriesArrayToMeetingSeriesArray,
  mapMeetingSeriesFormToApiCreateRequest,
  mapMeetingSeriesToApiUpdateRequest,
  mapApiExpectedAttendeesToExpectedAttendees,
  mapApiMeetingsCountBySeries,
} from '../mappers';
import type { Meeting, MeetingWriteData, MeetingSeriesType, MeetingSeries, MeetingSeriesWriteData, AudienceType, AudienceConfig, ExpectedAttendee } from '@/lib/types';

export const meetingsService = {
  /**
   * Get all meetings
   */
  async getAll(): Promise<Meeting[]> {
    const apiMeetings = await meetingsEndpoint.getAll();
    return mapApiMeetingsToMeetings(apiMeetings);
  },

  /**
   * Get meeting by ID
   */
  async getById(id: string): Promise<Meeting> {
    const apiMeeting = await meetingsEndpoint.getById(Number(id));
    return mapApiMeetingToMeeting(apiMeeting);
  },

  /**
   * Create a new meeting
   */
  async create(seriesId: string, data: MeetingWriteData): Promise<Meeting> {
    const request = mapMeetingToApiCreateRequest(Number(seriesId), data);
    const apiMeeting = await meetingsEndpoint.create(request);
    return mapApiMeetingToMeeting(apiMeeting);
  },

  /**
   * Update a meeting
   */
  async update(id: string, data: Partial<MeetingWriteData>): Promise<Meeting> {
    const request = mapMeetingToApiUpdateRequest(data);
    const apiMeeting = await meetingsEndpoint.update(Number(id), request);
    return mapApiMeetingToMeeting(apiMeeting);
  },

  /**
   * Delete a meeting
   */
  async delete(id: string): Promise<void> {
    await meetingsEndpoint.delete(Number(id));
  },

  /**
   * Get meetings by series ID
   */
  async getBySeriesId(seriesId: string): Promise<Meeting[]> {
    const apiMeetings = await meetingsEndpoint.getBySeriesId(Number(seriesId));
    return mapApiMeetingsToMeetings(apiMeetings);
  },

  /**
   * Get meetings with filters
   */
  async getWithFilters(filters: { seriesId?: string; startDate?: string; endDate?: string }): Promise<Meeting[]> {
    const apiFilters: { seriesId?: number; startDate?: string; endDate?: string } = {};
    if (filters.seriesId) apiFilters.seriesId = Number(filters.seriesId);
    if (filters.startDate) apiFilters.startDate = filters.startDate;
    if (filters.endDate) apiFilters.endDate = filters.endDate;
    const apiMeetings = await meetingsEndpoint.getWithFilters(apiFilters);
    return mapApiMeetingsToMeetings(apiMeetings);
  },

  /**
   * Get meetings by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<Meeting[]> {
    const apiMeetings = await meetingsEndpoint.getByDateRange(startDate, endDate);
    return mapApiMeetingsToMeetings(apiMeetings);
  },

  /**
   * Get general meetings
   */
  async getGeneralMeetings(): Promise<Meeting[]> {
    return this.getAll();
  },

  /**
   * Get GDI meetings
   */
  async getGdiMeetings(): Promise<Meeting[]> {
    return this.getAll();
  },

  /**
   * Get ministry area meetings
   */
  async getAreaMeetings(): Promise<Meeting[]> {
    return this.getAll();
  },

  /**
   * Get expected attendees for a meeting
   */
  async getExpectedAttendees(meetingId: string): Promise<ExpectedAttendee[]> {
    const apiAttendees = await meetingsEndpoint.getExpectedAttendees(Number(meetingId));
    return mapApiExpectedAttendeesToExpectedAttendees(apiAttendees);
  },

  /**
   * Cancel a date in a meeting series
   */
  async cancelSeriesDate(seriesId: string, date: string): Promise<MeetingSeries> {
    const apiSeries = await meetingSeriesEndpoint.cancelDate(Number(seriesId), date);
    return mapApiMeetingSeriesToMeetingSeries(apiSeries);
  },

  /**
   * Restore a cancelled date in a meeting series
   */
  async restoreSeriesDate(seriesId: string, date: string): Promise<MeetingSeries> {
    const apiSeries = await meetingSeriesEndpoint.restoreDate(Number(seriesId), date);
    return mapApiMeetingSeriesToMeetingSeries(apiSeries);
  },

  /**
   * Get meeting count grouped by series.
   * Returns a Record<seriesId, count> for O(1) lookup.
   */
  async getMeetingsCountBySeries(): Promise<Record<string, number>> {
    const data = await meetingsEndpoint.getCountBySeries();
    return mapApiMeetingsCountBySeries(data);
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all meetings
 */
export async function getAllMeetings(): Promise<Meeting[]> {
  return meetingsService.getAll();
}

/**
 * Get meeting by ID
 */
export async function getMeetingById(id: string): Promise<Meeting | null> {
  try {
    return await meetingsService.getById(id);
  } catch {
    return null;
  }
}

/**
 * Get all meeting series
 */
export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
  const apiSeries = await meetingSeriesEndpoint.getAll();
  return mapApiMeetingSeriesArrayToMeetingSeriesArray(apiSeries);
}

/**
 * Get meeting series by ID
 */
export async function getMeetingSeriesById(id: string): Promise<MeetingSeries | null> {
  try {
    const apiSeries = await meetingSeriesEndpoint.getById(Number(id));
    return mapApiMeetingSeriesToMeetingSeries(apiSeries);
  } catch {
    return null;
  }
}

/**
 * Get meeting series by audience type
 */
export async function getMeetingSeriesByAudienceType(audienceType: AudienceType): Promise<MeetingSeries[]> {
  const apiSeries = await meetingSeriesEndpoint.getAll({ audienceType });
  return mapApiMeetingSeriesArrayToMeetingSeriesArray(apiSeries);
}

/**
 * Get meeting series for a GDI
 */
export async function getMeetingSeriesByGdiId(gdiId: string): Promise<MeetingSeries[]> {
  const apiSeries = await meetingSeriesEndpoint.getByGdiId(Number(gdiId));
  return mapApiMeetingSeriesArrayToMeetingSeriesArray(apiSeries);
}

/**
 * Get meeting series for an area
 */
export async function getMeetingSeriesByAreaId(areaId: string): Promise<MeetingSeries[]> {
  const apiSeries = await meetingSeriesEndpoint.getByAreaId(Number(areaId));
  return mapApiMeetingSeriesArrayToMeetingSeriesArray(apiSeries);
}

/**
 * Get general meeting series (all_active or by_categories)
 */
export async function getGeneralMeetingSeries(): Promise<MeetingSeries[]> {
  const apiSeries = await meetingSeriesEndpoint.getGeneralSeries();
  return mapApiMeetingSeriesArrayToMeetingSeriesArray(apiSeries);
}

/**
 * Update a meeting
 */
export async function updateMeeting(id: string, data: Partial<MeetingWriteData>): Promise<Meeting> {
  return meetingsService.update(id, data);
}

/**
 * Update meeting minute
 */
export async function updateMeetingMinute(id: string, minute: string | null): Promise<Meeting> {
  return meetingsService.update(id, { minute: minute ?? undefined });
}

/**
 * Delete a meeting instance
 */
export async function deleteMeetingInstance(id: string): Promise<void> {
  return meetingsService.delete(id);
}

/**
 * Add a meeting series
 */
export async function addMeetingSeries(
  seriesData: MeetingSeriesWriteData
): Promise<{ series: MeetingSeries; newInstances?: Meeting[] }> {
  // Determine groupType and groupId from the data
  let groupType: MeetingSeriesType = seriesData.seriesType || 'general';
  let groupId = seriesData.ownerGroupId || '0';
  
  // Create the API request with required fields
  const requestData = {
    name: seriesData.name,
    description: seriesData.description,
    frequency: seriesData.frequency,
    defaultTime: seriesData.defaultTime || '09:00',
    defaultLocation: seriesData.defaultLocation || '',
    audienceType: seriesData.audienceType || 'all_active' as const,
    audienceConfig: seriesData.audienceConfig || undefined,
    seriesType: groupType,
    targetAttendeeGroups: seriesData.targetAttendeeGroups || ['allMembers' as const],
    oneTimeDate: seriesData.oneTimeDate ? new Date(seriesData.oneTimeDate) : undefined,
    weeklyDays: seriesData.weeklyDays,
    monthlyRuleType: seriesData.monthlyRuleType,
    monthlyDayOfMonth: seriesData.monthlyDayOfMonth,
    monthlyWeekOrdinal: seriesData.monthlyWeekOrdinal,
    monthlyDayOfWeek: seriesData.monthlyDayOfWeek,
  };
  
  const apiRequest = mapMeetingSeriesFormToApiCreateRequest(groupType, groupId, requestData);
  const apiSeries = await meetingSeriesEndpoint.create(apiRequest);
  const series = mapApiMeetingSeriesToMeetingSeries(apiSeries);

  return { series, newInstances: [] };
}

/**
 * Update a meeting series
 */
export async function updateMeetingSeries(
  seriesId: string,
  updates: Partial<{
    name: string;
    description: string;
    defaultTime: string;
    defaultLocation: string;
    endDate: string;
    audienceType: AudienceType;
    audienceConfig: AudienceConfig | null;
  }>
): Promise<{ 
  updatedSeries: MeetingSeries; 
  newlyGeneratedInstances?: Meeting[];
  message: string 
}> {
  const apiRequest = mapMeetingSeriesToApiUpdateRequest(updates);
  const apiSeries = await meetingSeriesEndpoint.update(Number(seriesId), apiRequest);
  const updatedSeries = mapApiMeetingSeriesToMeetingSeries(apiSeries);
  
  return {
    updatedSeries,
    newlyGeneratedInstances: [],
    message: 'Meeting series updated successfully',
  };
}

/**
 * Delete a meeting series
 */
export async function deleteMeetingSeries(seriesId: string): Promise<void> {
  await meetingSeriesEndpoint.delete(Number(seriesId));
}

/**
 * Add a meeting instance
 */
export async function addMeetingInstance(
  seriesId: string,
  instanceData: { name: string; date: string; time: string; location?: string; description?: string }
): Promise<Meeting> {
  return meetingsService.create(seriesId, {
    seriesId,
    name: instanceData.name,
    date: instanceData.date,
    time: instanceData.time,
    location: instanceData.location || '',
  });
}

/**
 * Get expected attendees for a meeting
 */
export async function getExpectedAttendees(meetingId: string): Promise<ExpectedAttendee[]> {
  return meetingsService.getExpectedAttendees(meetingId);
}

/**
 * Cancel a date in a meeting series
 */
export async function cancelSeriesDate(seriesId: string, date: string): Promise<MeetingSeries> {
  return meetingsService.cancelSeriesDate(seriesId, date);
}

/**
 * Restore a cancelled date in a meeting series
 */
export async function restoreSeriesDate(seriesId: string, date: string): Promise<MeetingSeries> {
  return meetingsService.restoreSeriesDate(seriesId, date);
}

/**
 * Get meeting count grouped by series (Record<seriesId, count>).
 */
export async function getMeetingsCountBySeries(): Promise<Record<string, number>> {
  return meetingsService.getMeetingsCountBySeries();
}

export default meetingsService;
