/**
 * Meeting Series Mapper
 *
 * Translates API responses to frontend domain types for meeting series.
 * Note: Frontend and backend both use PascalCase for enum values, so mapping is 1:1.
 */

import type {
  ApiMeetingSeriesResponse,
  ApiCreateMeetingSeriesRequest,
  ApiUpdateMeetingSeriesRequest,
  ApiDayOfWeek,
  ApiWeekOrdinal,
  ApiMonthlyRuleType,
  ApiMeetingFrequency,
  ApiAudienceType,
} from '../types';
import type {
  MeetingSeries,
  MeetingSeriesType,
  AudienceType,
  DayOfWeekType,
  WeekOrdinalType,
  MonthlyRuleType,
  MeetingFrequencyType,
  DefineMeetingSeriesFormValues,
} from '@/lib/types';

// ==============================================
// TYPE CASTING HELPERS (Frontend ↔ Backend)
// Both use PascalCase, so these are identity mappings with type safety
// ==============================================

function frequencyToApi(freq: MeetingFrequencyType): ApiMeetingFrequency {
  return freq as ApiMeetingFrequency;
}

function frequencyFromApi(freq: ApiMeetingFrequency): MeetingFrequencyType {
  return freq as MeetingFrequencyType;
}

function dayOfWeekToApi(day: DayOfWeekType): ApiDayOfWeek {
  return day as ApiDayOfWeek;
}

function dayOfWeekFromApi(day: ApiDayOfWeek): DayOfWeekType {
  return day as DayOfWeekType;
}

function weekOrdinalToApi(ordinal: WeekOrdinalType): ApiWeekOrdinal {
  return ordinal as ApiWeekOrdinal;
}

function weekOrdinalFromApi(ordinal: ApiWeekOrdinal): WeekOrdinalType {
  return ordinal as WeekOrdinalType;
}

function monthlyRuleToApi(rule: MonthlyRuleType): ApiMonthlyRuleType {
  return rule as ApiMonthlyRuleType;
}

function monthlyRuleFromApi(rule: ApiMonthlyRuleType): MonthlyRuleType {
  return rule as MonthlyRuleType;
}

function audienceTypeToApi(type: AudienceType): ApiAudienceType {
  return type as ApiAudienceType;
}

function audienceTypeFromApi(type: ApiAudienceType): AudienceType {
  return type as AudienceType;
}

/**
 * Maps audienceType to legacy seriesType for compatibility
 */
function audienceTypeToLegacySeriesType(audienceType: AudienceType): MeetingSeriesType {
  switch (audienceType) {
    case 'gdi':
      return 'gdi';
    case 'area':
      return 'ministryArea';
    case 'by_categories':
    case 'all_active':
    default:
      return 'general';
  }
}

/**
 * Maps legacy seriesType to audienceType
 */
function legacySeriesTypeToAudienceType(seriesType: MeetingSeriesType): AudienceType {
  switch (seriesType) {
    case 'gdi':
      return 'gdi';
    case 'ministryArea':
      return 'area';
    case 'general':
    default:
      return 'all_active';
  }
}

// ==============================================
// RESPONSE MAPPER (API → Frontend)
// ==============================================

/**
 * Maps API MeetingSeries response to frontend MeetingSeries type
 */
export function mapApiMeetingSeriesToMeetingSeries(api: ApiMeetingSeriesResponse): MeetingSeries {
  // Derive legacy fields from audienceType
  const seriesType = audienceTypeToLegacySeriesType(api.audienceType);
  let ownerGroupId: string | null = null;
  
  if (api.gdiId) {
    ownerGroupId = String(api.gdiId);
  } else if (api.areaId) {
    ownerGroupId = String(api.areaId);
  }

  return {
    id: String(api.seriesId),
    name: api.name,
    description: api.description,
    defaultTime: api.defaultTime,
    defaultLocation: api.defaultLocation,
    // New fields
    audienceType: audienceTypeFromApi(api.audienceType),
    gdiId: api.gdiId ? String(api.gdiId) : null,
    areaId: api.areaId ? String(api.areaId) : null,
    meetingTypeId: api.meetingTypeId ? String(api.meetingTypeId) : null,
    // Legacy fields for compatibility
    seriesType,
    ownerGroupId,
    targetAttendeeGroups: ['allMembers'], // Default - backend doesn't track this yet
    // Scheduling fields
    frequency: frequencyFromApi(api.frequency),
    startDate: api.startDate,
    endDate: api.endDate,
    oneTimeDate: api.oneTimeDate,
    cancelledDates: api.cancelledDates || [],
    weeklyDays: api.weeklyDays?.map(d => dayOfWeekFromApi(d)),
    monthlyRuleType: api.monthlyRuleType ? monthlyRuleFromApi(api.monthlyRuleType) : undefined,
    monthlyDayOfMonth: api.monthlyDayOfMonth,
    monthlyWeekOrdinal: api.monthlyWeekOrdinal ? weekOrdinalFromApi(api.monthlyWeekOrdinal) : undefined,
    monthlyDayOfWeek: api.monthlyDayOfWeek ? dayOfWeekFromApi(api.monthlyDayOfWeek) : undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

/**
 * Maps array of API MeetingSeries to frontend MeetingSeries
 */
export function mapApiMeetingSeriesArrayToMeetingSeriesArray(
  apiSeries: ApiMeetingSeriesResponse[]
): MeetingSeries[] {
  return apiSeries.map(mapApiMeetingSeriesToMeetingSeries);
}

// ==============================================
// REQUEST MAPPER (Frontend → API)
// ==============================================

/**
 * Maps frontend form values to API create request
 */
export function mapFormValuesToApiCreateRequest(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesData: DefineMeetingSeriesFormValues
): ApiCreateMeetingSeriesRequest {
  const numericGroupId = parseInt(groupId, 10);
  
  // Convert legacy seriesType to audienceType
  const audienceType = legacySeriesTypeToAudienceType(groupType);
  
  const request: ApiCreateMeetingSeriesRequest = {
    name: seriesData.name,
    frequency: frequencyToApi(seriesData.frequency),
    audienceType: audienceTypeToApi(audienceType),
    startDate: seriesData.oneTimeDate 
      ? seriesData.oneTimeDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    defaultTime: seriesData.defaultTime,
    defaultLocation: seriesData.defaultLocation,
    description: seriesData.description,
  };

  // Set group ownership
  if (groupType === 'gdi') {
    request.gdiId = numericGroupId;
  } else if (groupType === 'ministryArea') {
    request.areaId = numericGroupId;
  }

  // Map recurrence fields
  if (seriesData.oneTimeDate) {
    request.oneTimeDate = seriesData.oneTimeDate.toISOString().split('T')[0];
  }
  
  if (seriesData.weeklyDays && seriesData.weeklyDays.length > 0) {
    request.weeklyDays = seriesData.weeklyDays.map(d => dayOfWeekToApi(d));
  }
  
  if (seriesData.monthlyRuleType) {
    request.monthlyRuleType = monthlyRuleToApi(seriesData.monthlyRuleType);
  }
  
  if (seriesData.monthlyDayOfMonth !== undefined) {
    request.monthlyDayOfMonth = seriesData.monthlyDayOfMonth;
  }
  
  if (seriesData.monthlyWeekOrdinal) {
    request.monthlyWeekOrdinal = weekOrdinalToApi(seriesData.monthlyWeekOrdinal);
  }
  
  if (seriesData.monthlyDayOfWeek) {
    request.monthlyDayOfWeek = dayOfWeekToApi(seriesData.monthlyDayOfWeek);
  }

  return request;
}

/**
 * Maps update data to API update request
 */
export function mapMeetingSeriesToApiUpdateRequest(
  data: Partial<{
    name: string;
    description: string;
    defaultTime: string;
    defaultLocation: string;
    endDate: string;
  }>
): ApiUpdateMeetingSeriesRequest {
  const request: ApiUpdateMeetingSeriesRequest = {};
  
  if (data.name !== undefined) request.name = data.name;
  if (data.description !== undefined) request.description = data.description;
  if (data.defaultTime !== undefined) request.defaultTime = data.defaultTime;
  if (data.defaultLocation !== undefined) request.defaultLocation = data.defaultLocation;
  if (data.endDate !== undefined) request.endDate = data.endDate;
  
  return request;
}
