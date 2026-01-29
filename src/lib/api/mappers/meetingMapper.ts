/**
 * Meeting Mapper
 *
 * Translates API responses to frontend domain types.
 */

import type { ApiMeetingResponse, ApiCreateMeetingRequest, ApiUpdateMeetingRequest, ApiMeetingType } from '../types';
import type { Meeting, MeetingWriteData, MeetingSeriesType } from '@/lib/types';

/**
 * Maps API meeting type to frontend series type
 */
function mapApiTypeToSeriesType(apiType: ApiMeetingType): MeetingSeriesType {
  return apiType; // They happen to match: 'general' | 'gdi' | 'ministryArea'
}

/**
 * Maps frontend series type to API meeting type
 */
function mapSeriesTypeToApiType(seriesType: MeetingSeriesType): ApiMeetingType {
  return seriesType; // They happen to match
}

/**
 * Maps API Meeting response to frontend Meeting type
 */
export function mapApiMeetingToMeeting(apiMeeting: ApiMeetingResponse): Meeting {
  // Parse date to extract date string
  const dateObj = new Date(apiMeeting.date);
  const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

  return {
    id: String(apiMeeting.meetingId),
    seriesId: '', // The backend uses seriesName, we'll need to handle this differently
    name: apiMeeting.seriesName,
    date: dateStr,
    time: timeStr,
    location: '', // Backend doesn't track location
    description: undefined,
    attendeeUids: [], // Will be populated via attendance records
    minute: null,
  };
}

/**
 * Maps array of API Meetings to frontend Meetings
 */
export function mapApiMeetingsToMeetings(apiMeetings: ApiMeetingResponse[]): Meeting[] {
  return apiMeetings.map(mapApiMeetingToMeeting);
}

/**
 * Maps frontend Meeting write data to API create request
 */
export function mapMeetingToApiCreateRequest(meeting: MeetingWriteData, type: MeetingSeriesType = 'general'): ApiCreateMeetingRequest {
  // Combine date and time into ISO string
  const dateTimeStr = `${meeting.date}T${meeting.time}:00`;

  return {
    seriesName: meeting.name,
    date: dateTimeStr,
    type: mapSeriesTypeToApiType(type),
  };
}

/**
 * Maps frontend Meeting partial data to API update request
 */
export function mapMeetingToApiUpdateRequest(meeting: Partial<MeetingWriteData>, type?: MeetingSeriesType): ApiUpdateMeetingRequest {
  const request: ApiUpdateMeetingRequest = {};

  if (meeting.name !== undefined) request.seriesName = meeting.name;
  if (meeting.date !== undefined) {
    const time = meeting.time || '00:00';
    request.date = `${meeting.date}T${time}:00`;
  }
  if (type !== undefined) request.type = mapSeriesTypeToApiType(type);

  return request;
}
