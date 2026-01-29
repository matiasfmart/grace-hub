/**
 * Meetings Service
 *
 * Orchestrates API calls and mapping for meeting operations.
 */

import { meetingsEndpoint } from '../endpoints';
import {
  mapApiMeetingToMeeting,
  mapApiMeetingsToMeetings,
  mapMeetingToApiCreateRequest,
  mapMeetingToApiUpdateRequest,
} from '../mappers';
import { membersService } from './membersService';
import type { Meeting, MeetingWriteData, MeetingSeriesType, MeetingSeries, MeetingSeriesWriteData, Member } from '@/lib/types';

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
  async create(data: MeetingWriteData, type: MeetingSeriesType = 'general'): Promise<Meeting> {
    const request = mapMeetingToApiCreateRequest(data, type);
    const apiMeeting = await meetingsEndpoint.create(request);
    return mapApiMeetingToMeeting(apiMeeting);
  },

  /**
   * Update a meeting
   */
  async update(id: string, data: Partial<MeetingWriteData>, type?: MeetingSeriesType): Promise<Meeting> {
    const request = mapMeetingToApiUpdateRequest(data, type);
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
   * Get meetings by type
   */
  async getByType(type: MeetingSeriesType): Promise<Meeting[]> {
    const apiMeetings = await meetingsEndpoint.getByType(type);
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
    return this.getByType('general');
  },

  /**
   * Get GDI meetings
   */
  async getGdiMeetings(): Promise<Meeting[]> {
    return this.getByType('gdi');
  },

  /**
   * Get ministry area meetings
   */
  async getAreaMeetings(): Promise<Meeting[]> {
    return this.getByType('ministryArea');
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
 * Note: Backend doesn't support series yet, returning empty array
 * The meetings themselves are available via getAllMeetings()
 */
export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
  // Backend doesn't have meeting series concept yet
  // Return empty array - components should adapt to use meetings directly
  console.warn('getAllMeetingSeries: Backend does not support meeting series. Use getAllMeetings() instead.');
  return [];
}

/**
 * Get meeting series by ID
 * Note: Backend doesn't support series yet, returning null
 */
export async function getMeetingSeriesById(_id: string): Promise<MeetingSeries | null> {
  console.warn('getMeetingSeriesById: Backend does not support meeting series.');
  return null;
}

/**
 * Get resolved attendees for meeting
 * Note: In the new architecture, returns empty array as series don't exist
 * This function is deprecated - attendance is managed via attendance records
 */
export async function getResolvedAttendeesForMeeting(
  _meeting: Pick<Meeting, "seriesId" | "attendeeUids">
): Promise<Member[]> {
  console.warn('getResolvedAttendeesForMeeting is deprecated - attendance is managed via attendance records');
  // In the new architecture, we don't have meeting series
  // Return empty array - components should adapt to use attendance records
  return [];
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
 * Note: Backend doesn't support series yet - creates individual meeting instead
 */
export async function addMeetingSeries(
  seriesData: MeetingSeriesWriteData
): Promise<{ series: MeetingSeries; newInstances?: Meeting[] }> {
  console.warn('addMeetingSeries: Backend does not support meeting series. Creating individual meeting instead.');
  
  // Create individual meeting with the series data
  const meeting = await meetingsService.create({
    seriesId: '',
    name: seriesData.name,
    date: seriesData.oneTimeDate || new Date().toISOString().split('T')[0],
    time: seriesData.defaultTime,
    location: seriesData.defaultLocation || '',
  }, seriesData.seriesType);

  // Return a fake series object for compatibility
  const fakeSeries: MeetingSeries = {
    id: meeting.id,
    name: seriesData.name,
    description: seriesData.description,
    seriesType: seriesData.seriesType,
    ownerGroupId: seriesData.ownerGroupId,
    frequency: seriesData.frequency,
    defaultTime: seriesData.defaultTime,
    defaultLocation: seriesData.defaultLocation,
    targetAttendeeGroups: seriesData.targetAttendeeGroups || [],
    oneTimeDate: seriesData.oneTimeDate,
    weeklyDays: seriesData.weeklyDays,
    monthlyRuleType: seriesData.monthlyRuleType,
    monthlyDayOfMonth: seriesData.monthlyDayOfMonth,
    monthlyWeekOrdinal: seriesData.monthlyWeekOrdinal,
    monthlyDayOfWeek: seriesData.monthlyDayOfWeek,
  };

  return { series: fakeSeries, newInstances: [meeting] };
}

/**
 * Update a meeting series
 * Note: Backend doesn't support series yet
 */
export async function updateMeetingSeries(
  _seriesId: string,
  _updates: Partial<MeetingSeriesWriteData>
): Promise<{ 
  updatedSeries: MeetingSeries; 
  newlyGeneratedInstances?: Meeting[];
  message: string 
}> {
  throw new Error('updateMeetingSeries: Backend does not support meeting series. Update individual meetings instead.');
}

/**
 * Delete a meeting series
 * Note: Backend doesn't support series yet
 */
export async function deleteMeetingSeries(_seriesId: string): Promise<void> {
  throw new Error('deleteMeetingSeries: Backend does not support meeting series. Delete individual meetings instead.');
}

/**
 * Add a meeting instance
 */
export async function addMeetingInstance(
  seriesId: string,
  instanceData: { name: string; date: string; time: string; location?: string; description?: string }
): Promise<Meeting> {
  return meetingsService.create({
    seriesId,
    name: instanceData.name,
    date: instanceData.date,
    time: instanceData.time,
    location: instanceData.location || '',
  });
}

export default meetingsService;
