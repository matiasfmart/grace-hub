/**
 * Services Index
 *
 * Central export point for all API services.
 * Components should import from here.
 */

// Service objects
export { membersService } from './membersService';
export { gdisService } from './gdisService';
export { areasService } from './areasService';
export { meetingsService } from './meetingsService';
export { attendanceService } from './attendanceService';
export { tithesService } from './tithesService';
export { rolesService } from './rolesService';
export { roleTypesService } from './roleTypesService';
export { prospectsService } from './prospectsService';

// ==============================================
// CONVENIENCE FUNCTIONS (backward compatibility)
// ==============================================

// Members
export {
  getAllMembersNonPaginated,
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  addMember,
} from './membersService';

// GDIs
export {
  getAllGdis,
  getGdiById,
  createGdi,
  createGdiAndSyncMembers,
  addGdi,
  updateGdiAndSyncMembers,
  deleteGdi,
} from './gdisService';

// Areas (Ministry Areas)
export {
  getAllMinistryAreas,
  getMinistryAreaById,
  createMinistryArea,
  createMinistryAreaAndSyncMembers,
  addMinistryArea,
  updateMinistryAreaAndSyncMembers,
  deleteMinistryArea,
} from './areasService';

// Meetings
export {
  getAllMeetings,
  getMeetingById,
  getAllMeetingSeries,
  getMeetingSeriesById,
  updateMeeting,
  updateMeetingMinute,
  deleteMeetingInstance,
  addMeetingSeries,
  updateMeetingSeries,
  deleteMeetingSeries,
  addMeetingInstance,
  getExpectedAttendees,
  cancelSeriesDate,
  restoreSeriesDate,
} from './meetingsService';

// Attendance
export {
  getAllAttendanceRecords,
  getAttendanceForMeeting,
  saveAttendanceForMeeting,
  saveMeetingAttendance,
} from './attendanceService';

// Tithes
export {
  getAllTitheRecords,
} from './tithesService';

// Role Types (Ecclesiastical Labels) - convenience function
export async function getAllRoleTypes() {
  const { roleTypesService } = await import('./roleTypesService');
  return roleTypesService.getAll();
}

// Group Meetings
export {
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
  getMeetingsForGroupWithAttendees,
} from './groupMeetingsService';
