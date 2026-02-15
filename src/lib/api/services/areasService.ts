/**
 * Areas (Ministry Areas) Service
 *
 * Orchestrates API calls and mapping for area operations.
 */

import { areasEndpoint, membersEndpoint } from '../endpoints';
import {
  mapApiAreaToMinistryArea,
  mapApiAreasToMinistryAreas,
  mapMinistryAreaToApiCreateRequest,
  mapMinistryAreaToApiUpdateRequest,
  mapApiMembersToMembers,
} from '../mappers';
import type { MinistryArea, MinistryAreaWriteData, Member } from '@/lib/types';

export const areasService = {
  /**
   * Get all ministry areas
   */
  async getAll(): Promise<MinistryArea[]> {
    const apiAreas = await areasEndpoint.getAll();
    return mapApiAreasToMinistryAreas(apiAreas);
  },

  /**
   * Get area by ID
   */
  async getById(id: string): Promise<MinistryArea> {
    const apiArea = await areasEndpoint.getById(Number(id));
    return mapApiAreaToMinistryArea(apiArea);
  },

  /**
   * Get area with members populated
   */
  async getByIdWithMembers(id: string): Promise<MinistryArea & { members: Member[] }> {
    const [apiArea, membersResponse] = await Promise.all([
      areasEndpoint.getById(Number(id)),
      areasEndpoint.getMembers(Number(id)),
    ]);

    const area = mapApiAreaToMinistryArea(apiArea);
    const memberIds = membersResponse.memberIds;

    // Fetch member details if there are any members
    let members: Member[] = [];
    if (memberIds.length > 0) {
      const memberPromises = memberIds.map(memberId => membersEndpoint.getById(memberId));
      const apiMembers = await Promise.all(memberPromises);
      members = mapApiMembersToMembers(apiMembers);
    }

    return {
      ...area,
      memberIds: memberIds.map(String),
      members,
    };
  },

  /**
   * Create a new area
   */
  async create(data: MinistryAreaWriteData): Promise<MinistryArea> {
    const request = mapMinistryAreaToApiCreateRequest(data);
    const apiArea = await areasEndpoint.create(request);
    return mapApiAreaToMinistryArea(apiArea);
  },

  /**
   * Update an area
   */
  async update(id: string, data: Partial<MinistryAreaWriteData>): Promise<MinistryArea> {
    const request = mapMinistryAreaToApiUpdateRequest(data);
    const apiArea = await areasEndpoint.update(Number(id), request);
    return mapApiAreaToMinistryArea(apiArea);
  },

  /**
   * Delete an area
   */
  async delete(id: string): Promise<void> {
    await areasEndpoint.delete(Number(id));
  },

  /**
   * Assign member to area
   */
  async assignMember(areaId: string, memberId: string): Promise<void> {
    await areasEndpoint.assignMember(Number(areaId), Number(memberId));
  },

  /**
   * Remove member from area
   */
  async removeMember(areaId: string, memberId: string): Promise<void> {
    await areasEndpoint.removeMember(Number(areaId), Number(memberId));
  },

  /**
   * Get area member IDs
   */
  async getMemberIds(areaId: string): Promise<string[]> {
    const response = await areasEndpoint.getMembers(Number(areaId));
    return response.memberIds.map(String);
  },

  /**
   * Sync members for an area (add new, remove old)
   */
  async syncMembers(areaId: string, newMemberIds: string[]): Promise<void> {
    // Get current members
    const response = await areasEndpoint.getMembers(Number(areaId));
    const currentMemberIds = response.memberIds.map(String);
    
    // Calculate diff
    const toAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
    const toRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));

    // Execute changes in parallel
    const addPromises = toAdd.map(memberId => 
      areasEndpoint.assignMember(Number(areaId), Number(memberId))
    );
    const removePromises = toRemove.map(memberId => 
      areasEndpoint.removeMember(Number(areaId), Number(memberId))
    );

    await Promise.all([...addPromises, ...removePromises]);
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all ministry areas (with member IDs populated)
 */
export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
  const areas = await areasService.getAll();
  // Fetch member IDs for each area in parallel
  const areasWithMembers = await Promise.all(
    areas.map(async (area) => {
      const memberIds = await areasService.getMemberIds(area.id);
      return { ...area, memberIds };
    })
  );
  return areasWithMembers;
}

/**
 * Get ministry area by ID (with member IDs populated)
 */
export async function getMinistryAreaById(id: string): Promise<MinistryArea | null> {
  try {
    const area = await areasService.getById(id);
    // Fetch member IDs from memberships endpoint
    const memberIds = await areasService.getMemberIds(id);
    return {
      ...area,
      memberIds,
    };
  } catch {
    return null;
  }
}

/**
 * Create a ministry area
 */
export async function createMinistryArea(data: MinistryAreaWriteData): Promise<MinistryArea> {
  return areasService.create(data);
}

/**
 * Add a ministry area (alias for createMinistryArea)
 */
export async function addMinistryArea(data: MinistryAreaWriteData): Promise<MinistryArea> {
  return areasService.create(data);
}

/**
 * Update ministry area and sync members
 */
export async function updateMinistryAreaAndSyncMembers(
  id: string,
  data: Partial<MinistryAreaWriteData>,
  memberIds?: string[]
): Promise<MinistryArea> {
  // Update the area
  const updatedArea = await areasService.update(id, data);
  
  // Sync members if provided
  if (memberIds !== undefined) {
    await areasService.syncMembers(id, memberIds);
  }
  
  // Return with updated memberIds
  return {
    ...updatedArea,
    memberIds: memberIds ?? updatedArea.memberIds,
  };
}

/**
 * Delete a ministry area
 */
export async function deleteMinistryArea(id: string): Promise<void> {
  return areasService.delete(id);
}

export default areasService;
