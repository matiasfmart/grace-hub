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
    const [apiGdi, memberIds] = await Promise.all([
      gdisEndpoint.getById(Number(id)),
      gdisEndpoint.getMembers(Number(id)),
    ]);

    const gdi = mapApiGdiToGdi(apiGdi);
    
    // Fetch member details
    const memberPromises = memberIds.map(memberId => membersEndpoint.getById(memberId));
    const apiMembers = await Promise.all(memberPromises);
    const members = mapApiMembersToMembers(apiMembers);

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
    const memberIds = await gdisEndpoint.getMembers(Number(gdiId));
    return memberIds.map(String);
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all GDIs
 */
export async function getAllGdis(): Promise<GDI[]> {
  return gdisService.getAll();
}

/**
 * Get GDI by ID
 */
export async function getGdiById(id: string): Promise<GDI | null> {
  try {
    return await gdisService.getById(id);
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
 * Note: Member sync is handled by backend
 */
export async function updateGdiAndSyncMembers(
  id: string, 
  data: Partial<GDIWriteData>,
  _memberIds?: string[]
): Promise<GDI> {
  // Backend handles member sync, we just update the GDI
  return gdisService.update(id, data);
}

/**
 * Delete a GDI
 */
export async function deleteGdi(id: string): Promise<void> {
  return gdisService.delete(id);
}

export default gdisService;
