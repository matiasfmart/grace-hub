/**
 * GDI Mapper
 *
 * Translates API responses to frontend domain types.
 */

import type { ApiGdiResponse, ApiCreateGdiRequest, ApiUpdateGdiRequest } from '../types';
import type { GDI, GDIWriteData } from '@/lib/types';

/**
 * Maps API GDI response to frontend GDI type
 */
export function mapApiGdiToGdi(apiGdi: ApiGdiResponse): GDI {
  return {
    id: String(apiGdi.gdiId),
    name: apiGdi.name,
    guideId: apiGdi.guideId ? String(apiGdi.guideId) : '',
    mentorId: apiGdi.mentorId ? String(apiGdi.mentorId) : undefined,
    memberIds: [], // Will be populated separately via member assignments
    avgAttendancePct: apiGdi.avgAttendancePct ?? null,
    lastMeetingDate: apiGdi.lastMeetingDate ?? null,
  };
}

/**
 * Maps array of API GDIs to frontend GDIs
 */
export function mapApiGdisToGdis(apiGdis: ApiGdiResponse[]): GDI[] {
  return apiGdis.map(mapApiGdiToGdi);
}

/**
 * Maps frontend GDI write data to API create request
 */
export function mapGdiToApiCreateRequest(gdi: GDIWriteData): ApiCreateGdiRequest {
  return {
    name: gdi.name,
    guideId: gdi.guideId ? Number(gdi.guideId) : undefined,
    mentorId: gdi.mentorId ? Number(gdi.mentorId) : undefined,
  };
}

/**
 * Maps frontend GDI partial data to API update request
 */
export function mapGdiToApiUpdateRequest(gdi: Partial<GDIWriteData>): ApiUpdateGdiRequest {
  const request: ApiUpdateGdiRequest = {};

  if (gdi.name !== undefined) request.name = gdi.name;
  if (gdi.guideId !== undefined) request.guideId = gdi.guideId ? Number(gdi.guideId) : undefined;
  if (gdi.mentorId !== undefined) request.mentorId = gdi.mentorId ? Number(gdi.mentorId) : undefined;

  return request;
}
