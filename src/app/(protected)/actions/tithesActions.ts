"use server";

import { revalidatePath } from "next/cache";
import { tithesService } from "@/lib/api/services";

/**
 * Batch update tithe records for a given month.
 *
 * Creates records for members who tithed, deletes for those who didn't.
 * A single backend call replaces N individual create/delete operations.
 *
 * Architectural note: This is the ONLY entry point from Client Components
 * to the tithes mutation flow. Calls tithesService.batchUpsert (service layer)
 * instead of tithesEndpoint directly, preserving layer separation.
 */
export async function batchUpdateTithesAction(
	year: number,
	month: number,
	updates: { memberId: string; didTithe: boolean }[],
): Promise<{ success: boolean; message: string }> {
	try {
		await tithesService.batchUpsert(year, month, updates);
		revalidatePath("/tithes");
		return { success: true, message: "Registros de diezmos actualizados exitosamente." };
	} catch (error: any) {
		return { success: false, message: `Error al actualizar diezmos: ${error.message}` };
	}
}
