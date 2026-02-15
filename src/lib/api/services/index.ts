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
  addGdi,
  updateGdiAndSyncMembers,
  deleteGdi,
} from './gdisService';

// Areas (Ministry Areas)
export {
  getAllMinistryAreas,
  getMinistryAreaById,
  createMinistryArea,
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
  batchUpdateTithesForMonth,
} from './tithesService';

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
} from './groupMeetingsService';
