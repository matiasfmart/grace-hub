'use server';
import type { TitheRecord, TitheRecordWriteData } from '@/lib/types';
import { findDocuments, insertOneDocument, deleteOneDocument, deleteManyDocuments, getCollection } from '@/lib/db-utils';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

const TITHES_COLLECTION = 'tithes';

export async function getAllTitheRecords(): Promise<TitheRecord[]> {
    return findDocuments<TitheRecord>(TITHES_COLLECTION);
}

export async function setTitheStatus(memberId: string, year: number, month: number, didTithe: boolean): Promise<{ success: boolean; message: string }> {
    try {
        const filter = { memberId, year, month };
        const existingRecord = await findDocuments<TitheRecord>(TITHES_COLLECTION, filter);
        const recordExists = existingRecord.length > 0;

        if (didTithe && !recordExists) {
            const newRecord: TitheRecordWriteData = { memberId, year, month };
            await insertOneDocument(TITHES_COLLECTION, newRecord);
        } else if (!didTithe && recordExists) {
            await deleteOneDocument(TITHES_COLLECTION, filter);
        } else {
            return { success: true, message: "No change needed." };
        }

        revalidatePath('/tithes');
        return { success: true, message: "Estado de diezmo actualizado." };
    } catch (error: any) {
        console.error("Error setting tithe status:", error);
        return { success: false, message: `Error al actualizar: ${error.message}` };
    }
}

export async function batchUpdateTithesForMonth(
  year: number,
  month: number,
  updates: { memberId: string; didTithe: boolean }[]
): Promise<{ success: boolean; message: string }> {
  try {
    const collection = await getCollection(TITHES_COLLECTION);

    const bulkOps = updates.map(update => {
      const filter = { memberId: update.memberId, year, month };
      if (update.didTithe) {
        // Upsert: insert if not exists, do nothing if it does
        return {
          updateOne: {
            filter,
            update: { $setOnInsert: { memberId: update.memberId, year, month } },
            upsert: true,
          },
        };
      } else {
        // Delete if it exists
        return {
          deleteOne: {
            filter,
          },
        };
      }
    });

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps as any);
    }

    revalidatePath('/tithes');
    return { success: true, message: "Registros de diezmos actualizados exitosamente." };
  } catch (error: any) {
    console.error("Error batch updating tithes:", error);
    return { success: false, message: `Error al actualizar diezmos: ${error.message}` };
  }
}

/**
 * Deletes all tithe records for a specific member.
 * @param memberId The ID of the member.
 * @returns The number of deleted records.
 */
export async function deleteTithesForMember(memberId: string): Promise<number> {
    const result = await deleteManyDocuments(TITHES_COLLECTION, { memberId });
    return result.deletedCount;
}