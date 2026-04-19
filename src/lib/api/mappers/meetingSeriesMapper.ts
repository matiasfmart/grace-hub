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
  ApiAudienceConfig,
} from '../types';
import type {
  MeetingSeries,
  MeetingSeriesType,
  AudienceType,
  AudienceConfig,
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
 * Safely formats a date value to YYYY-MM-DD string
 * Handles both Date objects and already-formatted strings
 */
function formatDateToYYYYMMDD(date: Date | string | undefined): string {
  if (!date) {
    return new Date().toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    // Already a string, return as-is (assuming it's already formatted)
    return date.split('T')[0];
  }
  return date.toISOString().split('T')[0];
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
    audienceConfig: api.audienceConfig || null,
    // Legacy fields for compatibility
    seriesType,
    ownerGroupId,
    targetAttendeeGroups: (api.audienceType === 'all_active' || api.audienceType === 'integrated') ? ['allMembers'] : [], // Deprecated - use audienceType
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
 * 
 * Priority for audienceType:
 * 1. If groupType is 'gdi' → audienceType='gdi'
 * 2. If groupType is 'ministryArea' → audienceType='area'
 * 3. Otherwise, use seriesData.audienceType (from form selection)
 */
export function mapFormValuesToApiCreateRequest(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesData: DefineMeetingSeriesFormValues
): ApiCreateMeetingSeriesRequest {
  const numericGroupId = groupId ? parseInt(groupId, 10) : undefined;
  
  // Determine audienceType based on context
  let audienceType: AudienceType;
  if (groupType === 'gdi') {
    audienceType = 'gdi';
  } else if (groupType === 'ministryArea') {
    audienceType = 'area';
  } else {
    // For general meetings, use the form value directly
    audienceType = seriesData.audienceType || 'all_active';
  }
  
  const request: ApiCreateMeetingSeriesRequest = {
    name: seriesData.name,
    frequency: frequencyToApi(seriesData.frequency),
    audienceType: audienceTypeToApi(audienceType),
    startDate: formatDateToYYYYMMDD(seriesData.oneTimeDate),
    defaultTime: seriesData.defaultTime,
    defaultLocation: seriesData.defaultLocation,
    description: seriesData.description,
  };

  // Set group ownership
  if (groupType === 'gdi' && numericGroupId) {
    request.gdiId = numericGroupId;
  } else if (groupType === 'ministryArea' && numericGroupId) {
    request.areaId = numericGroupId;
  }

  // Include audienceConfig for by_categories type
  if (audienceType === 'by_categories' && seriesData.audienceConfig) {
    request.audienceConfig = seriesData.audienceConfig as ApiAudienceConfig;
  }

  // Map recurrence fields
  if (seriesData.oneTimeDate) {
    request.oneTimeDate = formatDateToYYYYMMDD(seriesData.oneTimeDate);
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
    audienceType: AudienceType;
    audienceConfig?: AudienceConfig | null;
  }>
): ApiUpdateMeetingSeriesRequest {
  const request: ApiUpdateMeetingSeriesRequest = {};
  
  if (data.name !== undefined) request.name = data.name;
  if (data.description !== undefined) request.description = data.description;
  if (data.defaultTime !== undefined) request.defaultTime = data.defaultTime;
  if (data.defaultLocation !== undefined) request.defaultLocation = data.defaultLocation;
  if (data.endDate !== undefined) request.endDate = data.endDate;
  if (data.audienceType !== undefined) request.audienceType = audienceTypeToApi(data.audienceType);
  if (data.audienceConfig !== undefined) request.audienceConfig = data.audienceConfig || undefined;
  
  return request;
}
