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
   * Get members by record status
   */
  async getByRecordStatus(recordStatus: 'vigente' | 'eliminado'): Promise<Member[]> {
    const apiMembers = await membersEndpoint.getByStatus(recordStatus);
    return mapApiMembersToMembers(apiMembers);
  },

  /**
   * Get active (vigente) members
   */
  async getActive(): Promise<Member[]> {
    return this.getByRecordStatus('vigente');
  },

  /**
   * Assign an ecclesiastical label to a member
   */
  async assignRoleType(memberId: string, roleTypeId: number): Promise<void> {
    await membersEndpoint.assignRoleType(Number(memberId), roleTypeId);
  },

  /**
   * Unassign an ecclesiastical label from a member
   */
  async removeRoleType(memberId: string, roleTypeId: number): Promise<void> {
    await membersEndpoint.removeRoleType(Number(memberId), roleTypeId);
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS
// ==============================================

/**
 * Get all members (simple, non-paginated)
 * Useful for dropdowns, selectors, and dashboard data
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
 * Get all members (paginated version with server-side filtering)
 * Uses backend filtering for scalability
 */
export async function getAllMembers(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  memberStatusFilters?: string[],
  roleFilters?: string[],
  gdiFilters?: string[],
  areaFilters?: string[],
  joinDateFrom?: string,
  joinDateTo?: string,
  ageMin?: number,
  ageMax?: number,
  sortBy?: 'fullName' | 'churchJoinDate' | 'birthDate',
  sortOrder?: 'asc' | 'desc',
): Promise<{ members: Member[]; totalMembers: number; totalPages: number }> {
  const params: import('../types').ApiMembersFilterParams = {
    page,
    pageSize,
    search: searchTerm?.trim() || undefined,
    status: memberStatusFilters?.length ? memberStatusFilters : undefined,
    role: roleFilters?.length ? roleFilters : undefined,
    gdi: gdiFilters?.length ? gdiFilters.map(g => Number(g)).filter(n => !isNaN(n)) : undefined,
    area: areaFilters?.length ? areaFilters.map(a => Number(a)).filter(n => !isNaN(n)) : undefined,
    joinFrom: joinDateFrom || undefined,
    joinTo: joinDateTo || undefined,
    ageMin: ageMin !== undefined ? ageMin : undefined,
    ageMax: ageMax !== undefined ? ageMax : undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  };

  const response = await membersEndpoint.search(params);

  return {
    members: mapApiMembersToMembers(response.data),
    totalMembers: response.totalCount,
    totalPages: response.totalPages,
  };
}

export default membersService;
