/**
 * Member Mapper
 *
 * Translates API responses to frontend domain types.
 * This is the ONLY place where backend contract knowledge exists.
 * If backend changes, only this file needs to update.
 */

import type { ApiMemberResponse, ApiCreateMemberRequest, ApiUpdateMemberRequest } from '../types';
import type { Member, MemberWriteData } from '@/lib/types';

/**
 * Maps API Member response to frontend Member type
 */
export function mapApiMemberToMember(apiMember: ApiMemberResponse): Member {
  return {
    id: String(apiMember.memberId),
    firstName: apiMember.firstName,
    lastName: apiMember.lastName,
    email: '', // Backend doesn't have email, using contact
    phone: apiMember.contact || '',
    // Keep dates as strings (YYYY-MM-DD) - Next.js can't serialize Date objects
    // between Server and Client Components
    birthDate: apiMember.birthDate || undefined,
    churchJoinDate: apiMember.joinDate || undefined,
    baptismDate: apiMember.baptismDate || undefined,
    attendsLifeSchool: apiMember.bibleStudy && apiMember.typeBibleStudy === 'LifeSchool',
    attendsBibleInstitute: apiMember.bibleStudy && apiMember.typeBibleStudy === 'BibleInstitute',
    fromAnotherChurch: false, // Backend doesn't track this
    assignedGDIId: null, // Will be populated separately via GDI assignments
    assignedAreaIds: [], // Will be populated separately via Area assignments
    status: apiMember.status,
    address: apiMember.address || undefined,
    roles: [], // Will be populated separately via Role assignments
  };
}

/**
 * Maps array of API Members to frontend Members
 */
export function mapApiMembersToMembers(apiMembers: ApiMemberResponse[]): Member[] {
  return apiMembers.map(mapApiMemberToMember);
}

/**
 * Maps frontend Member write data to API create request
 */
export function mapMemberToApiCreateRequest(member: MemberWriteData): ApiCreateMemberRequest {
  // Determine bible study type
  let bibleStudy = false;
  let typeBibleStudy: string | undefined;
  
  if (member.attendsLifeSchool) {
    bibleStudy = true;
    typeBibleStudy = 'LifeSchool';
  } else if (member.attendsBibleInstitute) {
    bibleStudy = true;
    typeBibleStudy = 'BibleInstitute';
  }

  return {
    firstName: member.firstName,
    lastName: member.lastName,
    contact: member.phone || member.email,
    status: member.status,
    // Dates are already strings in YYYY-MM-DD format (from Member type)
    birthDate: member.birthDate,
    baptismDate: member.baptismDate,
    joinDate: member.churchJoinDate,
    bibleStudy,
    typeBibleStudy,
    address: member.address,
  };
}

/**
 * Maps frontend Member partial data to API update request
 */
export function mapMemberToApiUpdateRequest(member: Partial<MemberWriteData>): ApiUpdateMemberRequest {
  const request: ApiUpdateMemberRequest = {};

  if (member.firstName !== undefined) request.firstName = member.firstName;
  if (member.lastName !== undefined) request.lastName = member.lastName;
  if (member.phone !== undefined || member.email !== undefined) {
    request.contact = member.phone || member.email;
  }
  if (member.status !== undefined) request.status = member.status;
  // Dates are already strings in YYYY-MM-DD format (from Member type)
  if (member.birthDate !== undefined) request.birthDate = member.birthDate;
  if (member.baptismDate !== undefined) request.baptismDate = member.baptismDate;
  if (member.churchJoinDate !== undefined) request.joinDate = member.churchJoinDate;
  
  if (member.attendsLifeSchool !== undefined || member.attendsBibleInstitute !== undefined) {
    if (member.attendsLifeSchool) {
      request.bibleStudy = true;
      request.typeBibleStudy = 'LifeSchool';
    } else if (member.attendsBibleInstitute) {
      request.bibleStudy = true;
      request.typeBibleStudy = 'BibleInstitute';
    } else {
      request.bibleStudy = false;
      request.typeBibleStudy = undefined;
    }
  }

  if (member.address !== undefined) request.address = member.address;

  return request;
}
