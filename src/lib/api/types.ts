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

export type ApiMemberStatus = 'Active' | 'Inactive' | 'New';
export type ApiMeetingType = 'general' | 'gdi' | 'ministryArea';
export type ApiRoleType = 'Leader' | 'Worker' | 'GeneralAttendee';

// ==============================================
// API RESPONSE TYPES (from backend DTOs)
// ==============================================

/**
 * MemberResponseDto from backend
 */
export interface ApiMemberResponse {
  memberId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  contact?: string;
  status: ApiMemberStatus;
  birthDate?: string;
  baptismDate?: string;
  joinDate?: string;
  bibleStudy: boolean;
  typeBibleStudy?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

/**
 * MeetingResponseDto from backend
 */
export interface ApiMeetingResponse {
  meetingId: number;
  seriesName: string;
  date: string;
  type: ApiMeetingType;
  createdAt: string;
  updatedAt: string;
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
  status?: ApiMemberStatus;
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
  status?: ApiMemberStatus;
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
}

export interface ApiUpdateAreaRequest {
  name?: string;
  description?: string;
}

export interface ApiCreateMeetingRequest {
  seriesName: string;
  date: string;
  type: ApiMeetingType;
}

export interface ApiUpdateMeetingRequest {
  seriesName?: string;
  date?: string;
  type?: ApiMeetingType;
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

export interface ApiCreateRoleRequest {
  memberId: number;
  roleGeneral: ApiRoleType;
}

export interface ApiUpdateRoleRequest {
  roleGeneral?: ApiRoleType;
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
