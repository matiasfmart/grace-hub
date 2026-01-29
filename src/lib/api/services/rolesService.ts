/**
 * Roles Service
 *
 * Orchestrates API calls and mapping for role operations.
 */

import { rolesEndpoint } from '../endpoints';
import {
  mapApiRoleToMemberRole,
  mapApiRolesToMemberRoles,
  mapMemberRoleToApiCreateRequest,
  mapMemberRoleToApiUpdateRequest,
  getMemberRoleTypes,
  type MemberRole,
} from '../mappers';
import type { MemberRoleType } from '@/lib/types';

export const rolesService = {
  /**
   * Get all role assignments
   */
  async getAll(): Promise<MemberRole[]> {
    const apiRoles = await rolesEndpoint.getAll();
    return mapApiRolesToMemberRoles(apiRoles);
  },

  /**
   * Get role by ID
   */
  async getById(id: string): Promise<MemberRole> {
    const apiRole = await rolesEndpoint.getById(Number(id));
    return mapApiRoleToMemberRole(apiRole);
  },

  /**
   * Assign role to member
   */
  async assignRole(memberId: string, role: MemberRoleType): Promise<MemberRole> {
    const request = mapMemberRoleToApiCreateRequest(memberId, role);
    const apiRole = await rolesEndpoint.create(request);
    return mapApiRoleToMemberRole(apiRole);
  },

  /**
   * Update role assignment
   */
  async updateRole(roleId: string, role: MemberRoleType): Promise<MemberRole> {
    const request = mapMemberRoleToApiUpdateRequest(role);
    const apiRole = await rolesEndpoint.update(Number(roleId), request);
    return mapApiRoleToMemberRole(apiRole);
  },

  /**
   * Remove role assignment
   */
  async removeRole(roleId: string): Promise<void> {
    await rolesEndpoint.delete(Number(roleId));
  },

  /**
   * Get roles for a member
   */
  async getByMember(memberId: string): Promise<MemberRole[]> {
    const apiRoles = await rolesEndpoint.getByMember(Number(memberId));
    return mapApiRolesToMemberRoles(apiRoles);
  },

  /**
   * Get role types for a member
   */
  async getMemberRoleTypes(memberId: string): Promise<MemberRoleType[]> {
    const roles = await this.getByMember(memberId);
    return getMemberRoleTypes(roles, memberId);
  },

  /**
   * Get members with a specific role type
   */
  async getByRoleType(roleType: MemberRoleType): Promise<MemberRole[]> {
    const apiRoles = await rolesEndpoint.getByRoleType(roleType);
    return mapApiRolesToMemberRoles(apiRoles);
  },

  /**
   * Check if member has a specific role
   */
  async hasRole(memberId: string, role: MemberRoleType): Promise<boolean> {
    const roles = await this.getByMember(memberId);
    return roles.some(r => r.role === role);
  },

  /**
   * Get all leaders
   */
  async getLeaders(): Promise<MemberRole[]> {
    return this.getByRoleType('Leader');
  },

  /**
   * Get all workers
   */
  async getWorkers(): Promise<MemberRole[]> {
    return this.getByRoleType('Worker');
  },
};

export default rolesService;
