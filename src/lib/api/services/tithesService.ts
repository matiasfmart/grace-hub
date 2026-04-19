/**
 * Tithes Service
 *
 * Orchestrates API calls and mapping for tithe operations.
 */

import { tithesEndpoint } from '../endpoints';
import {
  mapApiTitheToTitheRecord,
  mapApiTithesToTitheRecords,
  mapTitheRecordToApiCreateRequest,
} from '../mappers';
import type { TitheRecord, TitheRecordWriteData } from '@/lib/types';

export const tithesService = {
  /**
   * Get all tithe records
   */
  async getAll(): Promise<TitheRecord[]> {
    const apiTithes = await tithesEndpoint.getAll();
    return mapApiTithesToTitheRecords(apiTithes);
  },

  /**
   * Create tithe record
   */
  async create(data: TitheRecordWriteData): Promise<TitheRecord> {
    const request = mapTitheRecordToApiCreateRequest(data);
    const apiTithe = await tithesEndpoint.create(request);
    return mapApiTitheToTitheRecord(apiTithe);
  },

  /**
   * Delete tithe record
   */
  async delete(id: string): Promise<void> {
    await tithesEndpoint.delete(Number(id));
  },

  /**
   * Get tithes by member
   */
  async getByMember(memberId: string): Promise<TitheRecord[]> {
    const apiTithes = await tithesEndpoint.getByMember(Number(memberId));
    return mapApiTithesToTitheRecords(apiTithes);
  },

  /**
   * Get tithes by year and month
   */
  async getByYearMonth(year: number, month: number): Promise<TitheRecord[]> {
    const apiTithes = await tithesEndpoint.getByYearMonth(year, month);
    return mapApiTithesToTitheRecords(apiTithes);
  },

  /**
   * Check if member has tithed for a specific month
   */
  async hasTithed(memberId: string, year: number, month: number): Promise<boolean> {
    const tithes = await this.getByMember(memberId);
    return tithes.some(t => t.year === year && t.month === month);
  },

  /**
   * Get member tithe summary for a year
   */
  async getMemberYearSummary(memberId: string, year: number): Promise<{
    monthsTithed: number[];
    totalMonths: number;
    percentage: number;
  }> {
    const tithes = await this.getByMember(memberId);
    const yearTithes = tithes.filter(t => t.year === year);
    const monthsTithed = yearTithes.map(t => t.month).sort((a, b) => a - b);
    const totalMonths = monthsTithed.length;
    const percentage = (totalMonths / 12) * 100;

    return { monthsTithed, totalMonths, percentage };
  },

  /**
   * Record tithe for current month
   */
  async recordCurrentMonthTithe(memberId: string): Promise<TitheRecord> {
    const now = new Date();
    return this.create({
      memberId,
      year: now.getFullYear(),
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
    });
  },
};

// ==============================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ==============================================

/**
 * Get all tithe records
 */
export async function getAllTitheRecords(): Promise<TitheRecord[]> {
  return tithesService.getAll();
}

/**
 * Batch update tithes for month
 * Delegates the full create/delete logic to the backend batch endpoint
 * in a single request instead of N individual calls.
 */
export async function batchUpdateTithesForMonth(
  year: number,
  month: number,
  updates: { memberId: string; didTithe: boolean }[]
): Promise<{ success: boolean; message: string }> {
  try {
    const items = updates.map(u => ({
      memberId: Number(u.memberId),
      year,
      month,
      didTithe: u.didTithe,
    }));

    await tithesEndpoint.batchUpsert(items);

    return {
      success: true,
      message: "Registros de diezmos actualizados exitosamente.",
    };
  } catch (error: any) {
    console.error("Error batch updating tithes:", error);
    return {
      success: false,
      message: `Error al actualizar diezmos: ${error.message}`,
    };
  }
}

export default tithesService;
