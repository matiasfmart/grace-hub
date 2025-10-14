"use server";

import { revalidatePath } from "next/cache";
import type {
	GDI,
	GDIWriteData,
	MinistryArea,
	MinistryAreaWriteData,
} from "@/lib/types";
import {
	addGdi as addGdiService,
	deleteGdi as deleteGdiService,
	getAllGdis,
} from "@/services/gdiService";
import { bulkRecalculateAndUpdateRoles } from "@/services/memberService";
import {
	addMinistryArea as addMinistryAreaService,
	deleteMinistryArea as deleteMinistryAreaService,
	getAllMinistryAreas,
} from "@/services/ministryAreaService";

export async function addMinistryAreaActionSvc(
	newAreaData: Partial<Omit<MinistryArea, "id">> & {
		name: string;
		leaderId: string;
		memberIds?: string[];
	},
): Promise<{ success: boolean; message: string; newArea?: MinistryArea }> {
	try {
		const areaToWrite: MinistryAreaWriteData = {
			name: newAreaData.name,
			description: newAreaData.description || "",
			leaderId: newAreaData.leaderId,
			memberIds: newAreaData.memberIds || [],
		};
		const newArea = await addMinistryAreaService(areaToWrite);

		const affectedMemberIds = new Set<string>();
		affectedMemberIds.add(newArea.leaderId);
		(newAreaData.memberIds || []).forEach((id) => affectedMemberIds.add(id));

		if (affectedMemberIds.size > 0) {
			await bulkRecalculateAndUpdateRoles(Array.from(affectedMemberIds));
		}

		revalidatePath("/groups");
		revalidatePath(`/members`);
		return {
			success: true,
			message: `Área Ministerial "${newArea.name}" agregada exitosamente. Roles actualizados.`,
			newArea,
		};
	} catch (error: any) {
		console.error("Error agregando área ministerial:", error);
		return {
			success: false,
			message: `Error agregando área ministerial: ${error.message}`,
		};
	}
}

export async function addGdiActionSvc(
	newGdiData: Partial<Omit<GDI, "id">> & {
		name: string;
		guideId: string;
		memberIds?: string[];
	},
): Promise<{ success: boolean; message: string; newGdi?: GDI }> {
	try {
		const gdiToWrite: GDIWriteData = {
			name: newGdiData.name,
			guideId: newGdiData.guideId,
			memberIds: newGdiData.memberIds || [],
		};
		const newGdi = await addGdiService(gdiToWrite);

		const affectedMemberIds = new Set<string>();
		affectedMemberIds.add(newGdi.guideId);
		(newGdiData.memberIds || []).forEach((id) => affectedMemberIds.add(id));

		if (affectedMemberIds.size > 0) {
			await bulkRecalculateAndUpdateRoles(Array.from(affectedMemberIds));
		}

		revalidatePath("/groups");
		revalidatePath(`/members`);
		return {
			success: true,
			message: `GDI "${newGdi.name}" agregado exitosamente. Roles actualizados.`,
			newGdi,
		};
	} catch (error: any) {
		console.error("Error agregando GDI:", error);
		return { success: false, message: `Error agregando GDI: ${error.message}` };
	}
}

export async function deleteGdiActionSvc(
	gdiId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await deleteGdiService(gdiId);
		revalidatePath("/groups");
		revalidatePath("/members");
		const allGdis = await getAllGdis();
		allGdis.forEach((gdi) => revalidatePath(`/groups/gdis/${gdi.id}/admin`));

		return {
			success: true,
			message: "GDI eliminado exitosamente. Roles y asignaciones actualizados.",
		};
	} catch (error: any) {
		console.error("Error eliminando GDI:", error);
		return {
			success: false,
			message: `Error al eliminar GDI: ${error.message}`,
		};
	}
}

export async function deleteMinistryAreaActionSvc(
	areaId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await deleteMinistryAreaService(areaId);
		revalidatePath("/groups");
		revalidatePath("/members");
		const allAreas = await getAllMinistryAreas();
		allAreas.forEach((area) =>
			revalidatePath(`/groups/ministry-areas/${area.id}/admin`),
		);

		return {
			success: true,
			message:
				"Área Ministerial eliminada exitosamente. Roles y asignaciones actualizados.",
		};
	} catch (error: any) {
		console.error("Error eliminando Área Ministerial:", error);
		return {
			success: false,
			message: `Error al eliminar Área Ministerial: ${error.message}`,
		};
	}
}
