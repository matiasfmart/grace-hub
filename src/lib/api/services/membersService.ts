/**
 * Members Service
 *
 * Orchestrates API calls and mapping for member operations.
 * This is the layer that components should import.
 * Returns frontend domain types, not API types.
 */

import { membersEndpoint } from '../endpoints';
import {
  mapApiMemberToMember,
  mapApiMembersToMembers,
  mapMemberToApiCreateRequest,
  mapMemberToApiUpdateRequest,
} from '../mappers';
import type { Member, MemberWriteData } from '@/lib/types';

export const membersService = {
  /**
   * Get all members
   */
  async getAll(): Promise<Member[]> {
    const apiMembers = await membersEndpoint.getAll();
    return mapApiMembersToMembers(apiMembers);
  },

  /**
   * Get member by ID
   */
  async getById(id: string): Promise<Member> {
    const apiMember = await membersEndpoint.getById(Number(id));
    return mapApiMemberToMember(apiMember);
  },

  /**
   * Create a new member
   */
  async create(data: MemberWriteData): Promise<Member> {
    const request = mapMemberToApiCreateRequest(data);
    const apiMember = await membersEndpoint.create(request);
    return mapApiMemberToMember(apiMember);
  },

  /**
   * Update a member
   */
  async update(id: string, data: Partial<MemberWriteData>): Promise<Member> {
    const request = mapMemberToApiUpdateRequest(data);
    const apiMember = await membersEndpoint.update(Number(id), request);
    return mapApiMemberToMember(apiMember);
  },

  /**
   * Delete a member
   */
  async delete(id: string): Promise<void> {
    await membersEndpoint.delete(Number(id));
  },

  /**
   * Get members by status
   */
  async getByStatus(status: 'Active' | 'Inactive' | 'New'): Promise<Member[]> {
    const apiMembers = await membersEndpoint.getByStatus(status);
    return mapApiMembersToMembers(apiMembers);
  },

  /**
   * Get active members
   */
  async getActive(): Promise<Member[]> {
    return this.getByStatus('Active');
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all members (non-paginated)
 * @deprecated Use membersService.getAll() instead
 */
export async function getAllMembersNonPaginated(): Promise<Member[]> {
  return membersService.getAll();
}

/**
 * Get member by ID
 */
export async function getMemberById(id: string): Promise<Member | null> {
  try {
    return await membersService.getById(id);
  } catch {
    return null;
  }
}

/**
 * Create a new member
 */
export async function createMember(data: MemberWriteData): Promise<Member> {
  return membersService.create(data);
}

/**
 * Update a member
 */
export async function updateMember(id: string, data: Partial<MemberWriteData>): Promise<Member> {
  return membersService.update(id, data);
}

/**
 * Delete a member
 * Returns the deleted member for backward compatibility
 */
export async function deleteMember(id: string): Promise<Member | null> {
  try {
    // Get member before deletion for return value
    const member = await membersService.getById(id);
    await membersService.delete(id);
    return member;
  } catch {
    return null;
  }
}

/**
 * Add a new member (alias for createMember)
 */
export async function addMember(data: MemberWriteData): Promise<Member> {
  return membersService.create(data);
}

/**
 * Add member to assignments
 * Note: This is now handled automatically by the backend when creating/updating members
 * @deprecated Assignments are managed by the backend
 */
export async function addMemberToAssignments(_member: Member): Promise<void> {
  // Assignments are now managed by the backend
  console.warn('addMemberToAssignments is deprecated - assignments are managed by the backend');
}

/**
 * Update member assignments
 * Note: Use updateMember instead - assignments are updated along with other member data
 * @deprecated Use updateMember instead
 */
export async function updateMemberAssignments(
  memberId: string, 
  _originalMember: Member,
  _updatedMember: Member
): Promise<void> {
  // Assignments are now managed by the backend when updating members
  console.warn('updateMemberAssignments is deprecated - use updateMember instead');
}

/**
 * Bulk recalculate and update roles
 * Note: This is now a no-op as roles are managed by the backend
 * @deprecated Roles are managed by the backend
 */
export async function bulkRecalculateAndUpdateRoles(_memberIds: string[]): Promise<void> {
  // Roles are now managed by the backend
  // This function is kept for backward compatibility
  console.warn('bulkRecalculateAndUpdateRoles is deprecated - roles are managed by the backend');
}

/**
 * Get all members (paginated version for compatibility)
 * Note: Backend handles filtering now, this is a simplified version
 */
export async function getAllMembers(
  _page: number = 1,
  _pageSize: number = 10,
  _searchTerm?: string,
  _memberStatusFilters?: string[],
  _roleFilters?: string[],
  _guideFilters?: string[],
  _areaFilters?: string[]
): Promise<{ members: Member[]; totalMembers: number; totalPages: number }> {
  // For now, return all members - filtering can be added later
  const members = await membersService.getAll();
  return {
    members,
    totalMembers: members.length,
    totalPages: 1,
  };
}

export default membersService;
