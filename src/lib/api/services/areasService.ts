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
    const [apiArea, memberIds] = await Promise.all([
      areasEndpoint.getById(Number(id)),
      areasEndpoint.getMembers(Number(id)),
    ]);

    const area = mapApiAreaToMinistryArea(apiArea);

    // Fetch member details
    const memberPromises = memberIds.map(memberId => membersEndpoint.getById(memberId));
    const apiMembers = await Promise.all(memberPromises);
    const members = mapApiMembersToMembers(apiMembers);

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
    const memberIds = await areasEndpoint.getMembers(Number(areaId));
    return memberIds.map(String);
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all ministry areas
 */
export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
  return areasService.getAll();
}

/**
 * Get ministry area by ID
 */
export async function getMinistryAreaById(id: string): Promise<MinistryArea | null> {
  try {
    return await areasService.getById(id);
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
 * Note: Member sync is handled by backend
 */
export async function updateMinistryAreaAndSyncMembers(
  id: string,
  data: Partial<MinistryAreaWriteData>,
  _memberIds?: string[]
): Promise<MinistryArea> {
  return areasService.update(id, data);
}

/**
 * Delete a ministry area
 */
export async function deleteMinistryArea(id: string): Promise<void> {
  return areasService.delete(id);
}

export default areasService;
