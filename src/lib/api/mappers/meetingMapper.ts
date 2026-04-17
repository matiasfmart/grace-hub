/**
 * Meeting Mapper
 *
 * Translates API responses to frontend domain types.
 */

import type { ApiMeetingResponse, ApiCreateMeetingRequest, ApiUpdateMeetingRequest, ApiExpectedAttendeeResponse } from '../types';
import type { Meeting, MeetingWriteData, ExpectedAttendee } from '@/lib/types';

/**
 * Maps API Meeting response to frontend Meeting type
 */
export function mapApiMeetingToMeeting(apiMeeting: ApiMeetingResponse): Meeting {
  return {
    id: String(apiMeeting.meetingId),
    seriesId: String(apiMeeting.seriesId),
    name: '', // Name comes from series, not meeting
    date: apiMeeting.date,
    time: apiMeeting.time || '00:00',
    location: apiMeeting.location || '',
    description: apiMeeting.notes,
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
export function mapMeetingToApiCreateRequest(seriesId: number, meeting: MeetingWriteData): ApiCreateMeetingRequest {
  return {
    seriesId,
    date: meeting.date,
    time: meeting.time,
    location: meeting.location || undefined,
    notes: meeting.description || undefined,
  };
}

/**
 * Maps frontend Meeting partial data to API update request
 */
export function mapMeetingToApiUpdateRequest(meeting: Partial<MeetingWriteData>): ApiUpdateMeetingRequest {
  const request: ApiUpdateMeetingRequest = {};

  if (meeting.date !== undefined) request.date = meeting.date;
  if (meeting.time !== undefined) request.time = meeting.time;
  if (meeting.location !== undefined) request.location = meeting.location;
  if (meeting.description !== undefined) request.notes = meeting.description;

  return request;
}

/**
 * Maps API Expected Attendee to frontend ExpectedAttendee type
 */
export function mapApiExpectedAttendeeToExpectedAttendee(api: ApiExpectedAttendeeResponse): ExpectedAttendee {
  return {
    memberId: String(api.memberId),
    firstName: api.firstName,
    lastName: api.lastName,
    fullName: api.fullName,
  };
}

/**
 * Maps array of API Expected Attendees to frontend ExpectedAttendees
 */
export function mapApiExpectedAttendeesToExpectedAttendees(apiAttendees: ApiExpectedAttendeeResponse[]): ExpectedAttendee[] {
  return apiAttendees.map(mapApiExpectedAttendeeToExpectedAttendee);
}
