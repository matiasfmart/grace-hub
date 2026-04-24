/**
 * Area (Ministry Area) Mapper
 *
 * Translates API responses to frontend domain types.
 */

import type { ApiAreaResponse, ApiCreateAreaRequest, ApiUpdateAreaRequest } from '../types';
import type { MinistryArea, MinistryAreaWriteData } from '@/lib/types';

/**
 * Maps API Area response to frontend MinistryArea type
 */
export function mapApiAreaToMinistryArea(apiArea: ApiAreaResponse): MinistryArea {
  return {
    id: String(apiArea.areaId),
    name: apiArea.name,
    description: apiArea.description || '',
    leaderId: apiArea.leaderId ? String(apiArea.leaderId) : '',
    mentorId: apiArea.mentorId ? String(apiArea.mentorId) : '',
    memberIds: [], // Will be populated separately via member assignments
    avgAttendancePct: apiArea.avgAttendancePct ?? null,
    lastMeetingDate: apiArea.lastMeetingDate ?? null,
  };
}

/**
 * Maps array of API Areas to frontend MinistryAreas
 */
export function mapApiAreasToMinistryAreas(apiAreas: ApiAreaResponse[]): MinistryArea[] {
  return apiAreas.map(mapApiAreaToMinistryArea);
}

/**
 * Maps frontend MinistryArea write data to API create request
 */
export function mapMinistryAreaToApiCreateRequest(area: MinistryAreaWriteData): ApiCreateAreaRequest {
  return {
    name: area.name,
    description: area.description,
    leaderId: area.leaderId ? Number(area.leaderId) : undefined,
    mentorId: area.mentorId ? Number(area.mentorId) : undefined,
  };
}

/**
 * Maps frontend MinistryArea partial data to API update request
 */
export function mapMinistryAreaToApiUpdateRequest(area: Partial<MinistryAreaWriteData>): ApiUpdateAreaRequest {
  const request: ApiUpdateAreaRequest = {};

  if (area.name !== undefined) request.name = area.name;
  if (area.description !== undefined) request.description = area.description;
  if (area.leaderId !== undefined) request.leaderId = area.leaderId ? Number(area.leaderId) : undefined;
  if (area.mentorId !== undefined) request.mentorId = area.mentorId ? Number(area.mentorId) : undefined;

  return request;
}
