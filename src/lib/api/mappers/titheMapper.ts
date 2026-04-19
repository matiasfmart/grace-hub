/**
 * Tithe Mapper
 *
 * Translates API responses to frontend domain types.
 */

import type { ApiTitheResponse, ApiCreateTitheRequest } from '../types';
import type { TitheRecord, TitheRecordWriteData } from '@/lib/types';

/**
 * Maps API Tithe response to frontend TitheRecord type
 */
export function mapApiTitheToTitheRecord(apiTithe: ApiTitheResponse): TitheRecord {
  return {
    id: String(apiTithe.titheId),
    memberId: String(apiTithe.memberId),
    year: apiTithe.year,
    month: apiTithe.month,
  };
}

/**
 * Maps array of API Tithes to frontend TitheRecords
 */
export function mapApiTithesToTitheRecords(apiTithes: ApiTitheResponse[]): TitheRecord[] {
  return (apiTithes ?? []).map(mapApiTitheToTitheRecord);
}

/**
 * Maps frontend TitheRecord write data to API create request
 */
export function mapTitheRecordToApiCreateRequest(record: TitheRecordWriteData): ApiCreateTitheRequest {
  return {
    memberId: Number(record.memberId),
    year: record.year,
    month: record.month,
  };
}
