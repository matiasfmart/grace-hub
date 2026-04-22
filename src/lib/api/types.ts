/**
 * API Response Types
 *
 * These types match the backend DTOs exactly.
 * They are ONLY used internally by the API layer.
 * The mapper layer translates these to frontend domain types.
 */

// ==============================================
// ENUMS (matching backend constants)
// ==============================================

/**
 * Record status enum - matches backend members_record_status_enum
 * Used for soft-delete pattern
 */
export type ApiRecordStatus = 'vigente' | 'eliminado';
export type ApiMeetingType = 'general' | 'gdi' | 'ministryArea';
// Role types - updated to match frontend MemberRoleType
export type ApiRoleType = 'GdiGuide' | 'GdiMentor' | 'AreaLeader' | 'AreaMentor' | 'Worker';

// MeetingSeries API enums (matching backend PascalCase values)
export type ApiMeetingFrequency = 'OneTime' | 'Weekly' | 'Monthly';
export type ApiDayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type ApiMonthlyRuleType = 'DayOfMonth' | 'DayOfWeekOfMonth';
export type ApiWeekOrdinal = 'First' | 'Second' | 'Third' | 'Fourth' | 'Last';

// Audience type for meeting series (matching backend AudienceType enum)
export type ApiAudienceType = 'gdi' | 'area' | 'all_active' | 'integrated' | 'workers' | 'leaders' | 'mentors' | 'by_categories';

// Audience configuration for category-based filtering
export interface ApiAudienceConfig {
  roleTypeIds?: number[];
  labels?: string[];
  combineMode?: 'OR' | 'AND';
}

// ==============================================
// API RESPONSE TYPES (from backend DTOs)
// ==============================================

/**
 * Assigned GDI info from backend
 */
export interface ApiAssignedGdi {
  id: number;
  name: string;
}

/**
 * Assigned Area info from backend
 */
export interface ApiAssignedArea {
  id: number;
  name: string;
}

/**
 * Member role types from backend
 */
export type ApiMemberRoleType = 'GdiGuide' | 'GdiMentor' | 'AreaLeader' | 'AreaMentor' | 'Worker';

/**
 * Ecclesiastical label assigned to a member (from role_types table)
 */
export interface ApiEcclesiasticalRole {
  roleTypeId: number;
  name: string;
}

/**
 * MemberResponseDto from backend
 */
export interface ApiMemberResponse {
  memberId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  contact?: string;
  status: ApiRecordStatus; // Now uses vigente/eliminado
  birthDate?: string;
  baptismDate?: string;
  joinDate?: string;
  bibleStudy: boolean;
  typeBibleStudy?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched data from memberships
  assignedGdi?: ApiAssignedGdi;
  assignedAreas: ApiAssignedArea[];
  roles: ApiMemberRoleType[];
  ecclesiasticalRoles: ApiEcclesiasticalRole[];
}

/**
 * GdiResponseDto from backend
 */
export interface ApiGdiResponse {
  gdiId: number;
  name: string;
  guideId?: number;
  mentorId?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * AreaResponseDto from backend
 */
export interface ApiAreaResponse {
  areaId: number;
  name: string;
  description?: string;
  leaderId?: number;
  mentorId?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * MeetingResponseDto from backend
 */
export interface ApiMeetingResponse {
  meetingId: number;
  seriesId: number;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ExpectedAttendeeResponseDto from backend
 */
export interface ApiExpectedAttendeeResponse {
  memberId: number;
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * SeriesDateActionDto for cancel/restore date operations
 */
export interface ApiSeriesDateActionRequest {
  date: string;
}

/**
 * AttendanceResponseDto from backend
 */
export interface ApiAttendanceResponse {
  attendanceId: number;
  meetingId: number;
  memberId: number;
  wasPresent: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * TitheResponseDto from backend
 */
export interface ApiTitheResponse {
  titheId: number;
  memberId: number;
  year: number;
  month: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * RoleResponseDto from backend
 */
export interface ApiRoleResponse {
  roleId: number;
  memberId: number;
  roleGeneral: ApiRoleType;
  createdAt: string;
  updatedAt: string;
}

// ==============================================
// API REQUEST TYPES (for create/update operations)
// ==============================================

export interface ApiCreateMemberRequest {
  firstName: string;
  lastName: string;
  contact?: string;
  recordStatus?: ApiRecordStatus;
  birthDate?: string;
  baptismDate?: string;
  joinDate?: string;
  bibleStudy?: boolean;
  typeBibleStudy?: string;
  address?: string;
}

export interface ApiUpdateMemberRequest {
  firstName?: string;
  lastName?: string;
  contact?: string;
  recordStatus?: ApiRecordStatus;
  birthDate?: string;
  baptismDate?: string;
  joinDate?: string;
  bibleStudy?: boolean;
  typeBibleStudy?: string;
  address?: string;
}

export interface ApiCreateGdiRequest {
  name: string;
  guideId?: number;
  mentorId?: number;
}

export interface ApiUpdateGdiRequest {
  name?: string;
  guideId?: number;
  mentorId?: number;
}

export interface ApiCreateAreaRequest {
  name: string;
  description?: string;
  leaderId?: number;
  mentorId?: number;
}

export interface ApiUpdateAreaRequest {
  name?: string;
  description?: string;
  leaderId?: number;
  mentorId?: number;
}

export interface ApiCreateMeetingRequest {
  seriesId: number;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
}

export interface ApiUpdateMeetingRequest {
  date?: string;
  time?: string;
  location?: string;
  notes?: string;
}

export interface ApiCreateAttendanceRequest {
  meetingId: number;
  memberId: number;
  wasPresent: boolean;
}

export interface ApiUpdateAttendanceRequest {
  wasPresent?: boolean;
}

export interface ApiCreateTitheRequest {
  memberId: number;
  year: number;
  month: number;
}

export interface ApiBatchTitheItem {
  memberId: number;
  year: number;
  month: number;
  didTithe: boolean;
}

export interface ApiBatchUpsertTithesRequest {
  items: ApiBatchTitheItem[];
}

export interface ApiCreateRoleRequest {
  memberId: number;
  roleGeneral: ApiRoleType;
}

export interface ApiUpdateRoleRequest {
  roleGeneral?: ApiRoleType;
}

// ==============================================
// MEETING SERIES API TYPES
// ==============================================

export interface ApiCreateMeetingSeriesRequest {
  name: string;
  frequency: ApiMeetingFrequency;
  startDate: string; // YYYY-MM-DD
  audienceType: ApiAudienceType;
  gdiId?: number;
  areaId?: number;
  meetingTypeId?: number;
  audienceConfig?: ApiAudienceConfig;
  endDate?: string;
  defaultTime?: string;
  defaultLocation?: string;
  description?: string;
  oneTimeDate?: string;
  weeklyDays?: ApiDayOfWeek[];
  monthlyRuleType?: ApiMonthlyRuleType;
  monthlyDayOfMonth?: number;
  monthlyWeekOrdinal?: ApiWeekOrdinal;
  monthlyDayOfWeek?: ApiDayOfWeek;
}

export interface ApiUpdateMeetingSeriesRequest {
  name?: string;
  description?: string;
  defaultTime?: string;
  defaultLocation?: string;
  endDate?: string;
  audienceType?: ApiAudienceType;
  audienceConfig?: ApiAudienceConfig;
}

export interface ApiMeetingSeriesResponse {
  seriesId: number;
  name: string;
  description?: string;
  audienceType: ApiAudienceType;
  gdiId?: number;
  areaId?: number;
  meetingTypeId?: number;
  audienceConfig?: ApiAudienceConfig;
  frequency: ApiMeetingFrequency;
  startDate: string;
  endDate?: string;
  defaultTime?: string;
  defaultLocation?: string;
  oneTimeDate?: string;
  weeklyDays?: ApiDayOfWeek[];
  monthlyRuleType?: ApiMonthlyRuleType;
  monthlyDayOfMonth?: number;
  monthlyWeekOrdinal?: ApiWeekOrdinal;
  monthlyDayOfWeek?: ApiDayOfWeek;
  cancelledDates: string[];
  createdAt: string;
  updatedAt: string;
}

// Filters for listing meeting series
export interface ApiMeetingSeriesFilters {
  gdiId?: number;
  areaId?: number;
  audienceType?: ApiAudienceType;
}

// Filters for listing meetings
export interface ApiMeetingsFilters {
  seriesId?: number;
  startDate?: string;
  endDate?: string;
}

// ==============================================
// ROLE TYPES (Ecclesiastical Labels) API TYPES
// ==============================================

/**
 * RoleType response from backend - represents ecclesiastical labels like Pastor, Diácono, etc.
 */
export interface ApiRoleTypeResponse {
  roleTypeId: number;
  name: string;
  createdAt?: string;
}

/**
 * Create RoleType request
 */
export interface ApiCreateRoleTypeRequest {
  name: string;
}

/**
 * Update RoleType request
 */
export interface ApiUpdateRoleTypeRequest {
  name: string;
}

// ==============================================
// API PAGINATED/LIST RESPONSE WRAPPER
// ==============================================

export interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Paginated members response from backend
 */
export interface ApiPaginatedMembersResponse {
  data: ApiMemberResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Query params for filtered members search
 */
export interface ApiMembersFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  role?: string[];
  gdi?: number[];
  area?: number[];
  /** ISO date YYYY-MM-DD — lower bound for church join date */
  joinFrom?: string;
  /** ISO date YYYY-MM-DD — upper bound for church join date */
  joinTo?: string;
  /** Minimum age (inclusive) */
  ageMin?: number;
  /** Maximum age (inclusive) */
  ageMax?: number;
  /** Field to sort by */
  sortBy?: 'fullName' | 'churchJoinDate' | 'birthDate';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

export interface ApiListResponse<T> {
  data: T[];
}

// ==============================================
// API ERROR RESPONSE
// ==============================================

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
