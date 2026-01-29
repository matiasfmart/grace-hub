/**
 * Role Mapper
 *
 * Translates API responses to frontend domain types.
 */

import type { ApiRoleResponse, ApiCreateRoleRequest, ApiUpdateRoleRequest, ApiRoleType } from '../types';
import type { MemberRoleType } from '@/lib/types';

/**
 * Frontend representation of a member's role assignment
 */
export interface MemberRole {
  id: string;
  memberId: string;
  role: MemberRoleType;
}

/**
 * Maps API role type to frontend role type
 */
function mapApiRoleType(apiRole: ApiRoleType): MemberRoleType {
  return apiRole; // They match: 'Leader' | 'Worker' | 'GeneralAttendee'
}

/**
 * Maps frontend role type to API role type
 */
function mapRoleTypeToApi(role: MemberRoleType): ApiRoleType {
  return role; // They match
}

/**
 * Maps API Role response to frontend MemberRole type
 */
export function mapApiRoleToMemberRole(apiRole: ApiRoleResponse): MemberRole {
  return {
    id: String(apiRole.roleId),
    memberId: String(apiRole.memberId),
    role: mapApiRoleType(apiRole.roleGeneral),
  };
}

/**
 * Maps array of API Roles to frontend MemberRoles
 */
export function mapApiRolesToMemberRoles(apiRoles: ApiRoleResponse[]): MemberRole[] {
  return apiRoles.map(mapApiRoleToMemberRole);
}

/**
 * Maps frontend role assignment to API create request
 */
export function mapMemberRoleToApiCreateRequest(memberId: string, role: MemberRoleType): ApiCreateRoleRequest {
  return {
    memberId: Number(memberId),
    roleGeneral: mapRoleTypeToApi(role),
  };
}

/**
 * Maps frontend role update to API update request
 */
export function mapMemberRoleToApiUpdateRequest(role: MemberRoleType): ApiUpdateRoleRequest {
  return {
    roleGeneral: mapRoleTypeToApi(role),
  };
}

/**
 * Gets all role types for a member from role list
 */
export function getMemberRoleTypes(roles: MemberRole[], memberId: string): MemberRoleType[] {
  return roles
    .filter(r => r.memberId === memberId)
    .map(r => r.role);
}
