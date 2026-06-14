/**
 * Mappers Index
 *
 * Central export point for all API mappers.
 * Mappers translate between API contracts and frontend domain types.
 */

// Member mappers
export {
  mapApiMemberToMember,
  mapApiMembersToMembers,
  mapMemberToApiCreateRequest,
  mapMemberToApiUpdateRequest,
  mapApiMemberCount,
  mapApiMemberRoleSummary,
} from './memberMapper';

// GDI mappers
export {
  mapApiGdiToGdi,
  mapApiGdisToGdis,
  mapGdiToApiCreateRequest,
  mapGdiToApiUpdateRequest,
} from './gdiMapper';

// Area (Ministry Area) mappers
export {
  mapApiAreaToMinistryArea,
  mapApiAreasToMinistryAreas,
  mapMinistryAreaToApiCreateRequest,
  mapMinistryAreaToApiUpdateRequest,
} from './areaMapper';

// Prospect mappers
export {
  mapApiProspectToProspect,
  mapApiProspectsToProspects,
} from './prospectMapper';

// Meeting mappers
export {
  mapApiMeetingToMeeting,
  mapApiMeetingsToMeetings,
  mapMeetingToApiCreateRequest,
  mapMeetingToApiUpdateRequest,
  mapApiExpectedAttendeeToExpectedAttendee,
  mapApiExpectedAttendeesToExpectedAttendees,
  mapApiMeetingsCountBySeries,
} from './meetingMapper';

// Attendance mappers
export {
  mapApiAttendanceToAttendanceRecord,
  mapApiAttendancesToAttendanceRecords,
  mapAttendanceRecordToApiCreateRequest,
  mapAttendanceRecordToApiUpdateRequest,
  mapBulkAttendanceToApiRequests,
  mapApiAttendanceStats,
} from './attendanceMapper';

// Tithe mappers
export {
  mapApiTitheToTitheRecord,
  mapApiTithesToTitheRecords,
  mapTitheRecordToApiCreateRequest,
} from './titheMapper';

// Role mappers
export {
  mapApiRoleToMemberRole,
  mapApiRolesToMemberRoles,
  mapMemberRoleToApiCreateRequest,
  mapMemberRoleToApiUpdateRequest,
  getMemberRoleTypes,
  type MemberRole,
} from './roleMapper';

// Meeting Series mappers
export {
  mapApiMeetingSeriesToMeetingSeries,
  mapApiMeetingSeriesArrayToMeetingSeriesArray,
  mapFormValuesToApiCreateRequest as mapMeetingSeriesFormToApiCreateRequest,
  mapMeetingSeriesToApiUpdateRequest,
} from './meetingSeriesMapper';

// Role Types (Ecclesiastical Labels) mappers
export {
  mapApiRoleTypeToRoleType,
  mapApiRoleTypesToRoleTypes,
  mapRoleTypeToApiCreateRequest,
  type RoleType,
} from './roleTypesMapper';
