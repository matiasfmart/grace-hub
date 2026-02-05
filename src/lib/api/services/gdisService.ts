/**
 * GDIs Service
 *
 * Orchestrates API calls and mapping for GDI operations.
 */

import { gdisEndpoint, membersEndpoint } from '../endpoints';
import {
  mapApiGdiToGdi,
  mapApiGdisToGdis,
  mapGdiToApiCreateRequest,
  mapGdiToApiUpdateRequest,
  mapApiMembersToMembers,
} from '../mappers';
import type { GDI, GDIWriteData, Member } from '@/lib/types';

export const gdisService = {
  /**
   * Get all GDIs
   */
  async getAll(): Promise<GDI[]> {
    const apiGdis = await gdisEndpoint.getAll();
    return mapApiGdisToGdis(apiGdis);
  },

  /**
   * Get GDI by ID
   */
  async getById(id: string): Promise<GDI> {
    const apiGdi = await gdisEndpoint.getById(Number(id));
    return mapApiGdiToGdi(apiGdi);
  },

  /**
   * Get GDI with members populated
   */
  async getByIdWithMembers(id: string): Promise<GDI & { members: Member[] }> {
    const [apiGdi, membersResponse] = await Promise.all([
      gdisEndpoint.getById(Number(id)),
      gdisEndpoint.getMembers(Number(id)),
    ]);

    const gdi = mapApiGdiToGdi(apiGdi);
    const memberIds = membersResponse.memberIds;
    
    // Fetch member details if there are any members
    let members: Member[] = [];
    if (memberIds.length > 0) {
      const memberPromises = memberIds.map(memberId => membersEndpoint.getById(memberId));
      const apiMembers = await Promise.all(memberPromises);
      members = mapApiMembersToMembers(apiMembers);
    }

    return {
      ...gdi,
      memberIds: memberIds.map(String),
      members,
    };
  },

  /**
   * Create a new GDI
   */
  async create(data: GDIWriteData): Promise<GDI> {
    const request = mapGdiToApiCreateRequest(data);
    const apiGdi = await gdisEndpoint.create(request);
    return mapApiGdiToGdi(apiGdi);
  },

  /**
   * Update a GDI
   */
  async update(id: string, data: Partial<GDIWriteData>): Promise<GDI> {
    const request = mapGdiToApiUpdateRequest(data);
    const apiGdi = await gdisEndpoint.update(Number(id), request);
    return mapApiGdiToGdi(apiGdi);
  },

  /**
   * Delete a GDI
   */
  async delete(id: string): Promise<void> {
    await gdisEndpoint.delete(Number(id));
  },

  /**
   * Assign member to GDI
   */
  async assignMember(gdiId: string, memberId: string): Promise<void> {
    await gdisEndpoint.assignMember(Number(gdiId), Number(memberId));
  },

  /**
   * Remove member from GDI
   */
  async removeMember(gdiId: string, memberId: string): Promise<void> {
    await gdisEndpoint.removeMember(Number(gdiId), Number(memberId));
  },

  /**
   * Get GDI member IDs
   */
  async getMemberIds(gdiId: string): Promise<string[]> {
    const response = await gdisEndpoint.getMembers(Number(gdiId));
    return response.memberIds.map(String);
  },

  /**
   * Sync members for a GDI (add new, remove old)
   */
  async syncMembers(gdiId: string, newMemberIds: string[]): Promise<void> {
    // Get current members
    const response = await gdisEndpoint.getMembers(Number(gdiId));
    const currentMemberIds = response.memberIds.map(String);
    
    // Calculate diff
    const toAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
    const toRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));

    // Execute changes in parallel
    const addPromises = toAdd.map(memberId => 
      gdisEndpoint.assignMember(Number(gdiId), Number(memberId))
    );
    const removePromises = toRemove.map(memberId => 
      gdisEndpoint.removeMember(Number(gdiId), Number(memberId))
    );

    await Promise.all([...addPromises, ...removePromises]);
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all GDIs (with member IDs populated)
 */
export async function getAllGdis(): Promise<GDI[]> {
  const gdis = await gdisService.getAll();
  // Fetch member IDs for each GDI in parallel
  const gdisWithMembers = await Promise.all(
    gdis.map(async (gdi) => {
      const memberIds = await gdisService.getMemberIds(gdi.id);
      return { ...gdi, memberIds };
    })
  );
  return gdisWithMembers;
}

/**
 * Get GDI by ID (with member IDs populated)
 */
export async function getGdiById(id: string): Promise<GDI | null> {
  try {
    const gdi = await gdisService.getById(id);
    // Fetch member IDs from memberships endpoint
    const memberIds = await gdisService.getMemberIds(id);
    return {
      ...gdi,
      memberIds,
    };
  } catch {
    return null;
  }
}

/**
 * Create a new GDI
 */
export async function createGdi(data: GDIWriteData): Promise<GDI> {
  return gdisService.create(data);
}

/**
 * Add a GDI (alias for createGdi)
 */
export async function addGdi(data: GDIWriteData): Promise<GDI> {
  return gdisService.create(data);
}

/**
 * Update GDI and sync members
 */
export async function updateGdiAndSyncMembers(
  id: string, 
  data: Partial<GDIWriteData>,
  memberIds?: string[]
): Promise<GDI> {
  // Update the GDI
  const updatedGdi = await gdisService.update(id, data);
  
  // Sync members if provided
  if (memberIds !== undefined) {
    await gdisService.syncMembers(id, memberIds);
  }
  
  // Return with updated memberIds
  return {
    ...updatedGdi,
    memberIds: memberIds ?? updatedGdi.memberIds,
  };
}

/**
 * Delete a GDI
 */
export async function deleteGdi(id: string): Promise<void> {
  return gdisService.delete(id);
}

export default gdisService;
