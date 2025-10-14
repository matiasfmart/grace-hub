"use server";
import { revalidatePath } from "next/cache";
import {
	deleteManyDocuments,
	deleteOneDocument,
	findDocuments,
	getCollection,
	insertOneDocument,
} from "@/lib/db-utils";
import { toObjectId } from "@/lib/id-utils";
import type { TitheRecord, TitheRecordDocument } from "@/lib/types";

const TITHES_COLLECTION = "tithes";

// ============================================
// READ OPERATIONS
// ============================================

export async function getAllTitheRecords(): Promise<TitheRecord[]> {
	return findDocuments<TitheRecordDocument>(TITHES_COLLECTION);
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function setTitheStatus(
	memberId: string,
	year: number,
	month: number,
	didTithe: boolean,
): Promise<{ success: boolean; message: string }> {
	try {
		const memberOid = toObjectId(memberId);
		if (!memberOid) throw new Error("Invalid Member ID");

		const filter = { memberId: memberOid, year, month };
		const existingRecord = await findDocuments<TitheRecordDocument>(
			TITHES_COLLECTION,
			filter,
		);
		const recordExists = existingRecord.length > 0;

		if (didTithe && !recordExists) {
			const newRecordDoc: Omit<TitheRecordDocument, "_id"> = {
				memberId: memberOid,
				year,
				month,
			};
			await insertOneDocument(TITHES_COLLECTION, newRecordDoc);
		} else if (!didTithe && recordExists) {
			await deleteOneDocument(TITHES_COLLECTION, filter);
		} else {
			return { success: true, message: "No change needed." };
		}

		revalidatePath("/tithes");
		return { success: true, message: "Estado de diezmo actualizado." };
	} catch (error: any) {
		console.error("Error setting tithe status:", error);
		return { success: false, message: `Error al actualizar: ${error.message}` };
	}
}

export async function batchUpdateTithesForMonth(
	year: number,
	month: number,
	updates: { memberId: string; didTithe: boolean }[],
): Promise<{ success: boolean; message: string }> {
	try {
		const collection = await getCollection(TITHES_COLLECTION);

		const bulkOps = updates.map((update) => {
			const memberOid = toObjectId(update.memberId);
			if (!memberOid) throw new Error(`Invalid Member ID: ${update.memberId}`);

			const filter = { memberId: memberOid, year, month };
			if (update.didTithe) {
				// Upsert: insert if not exists, do nothing if it does
				return {
					updateOne: {
						filter,
						update: { $setOnInsert: { memberId: memberOid, year, month } },
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

		revalidatePath("/tithes");
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

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Deletes all tithe records for a specific member.
 */
export async function deleteTithesForMember(memberId: string): Promise<number> {
	const memberOid = toObjectId(memberId);
	if (!memberOid) return 0;

	const result = await deleteManyDocuments(TITHES_COLLECTION, {
		memberId: memberOid,
	});
	return result.deletedCount;
}
