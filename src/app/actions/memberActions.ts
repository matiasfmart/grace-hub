"use server";

import { revalidatePath } from "next/cache";
import type { Member, MemberWriteData } from "@/lib/types";
import {
	addMember,
	deleteMember,
	getMemberById,
	updateMember,
	gdisService,
	areasService,
} from "@/lib/api/services";

export async function addSingleMemberAction(
	newMemberData: MemberWriteData,
): Promise<{ success: boolean; message: string; newMember?: Member }> {
	try {
		const newMember = await addMember(newMemberData);

		// Assign member to GDI if specified
		if (newMemberData.assignedGDIId) {
			await gdisService.assignMember(newMemberData.assignedGDIId, newMember.id);
		}

		// Assign member to Areas if specified
		if (newMemberData.assignedAreaIds?.length) {
			await Promise.all(
				newMemberData.assignedAreaIds.map((areaId) =>
					areasService.assignMember(areaId, newMember.id)
				)
			);
		}

		revalidatePath("/members");
		revalidatePath("/groups");
		if (newMember.assignedAreaIds) {
			newMember.assignedAreaIds.forEach((areaId) => {
				revalidatePath(`/groups/ministry-areas/${areaId}/manage`);
			});
		}
		if (newMember.assignedGDIId) {
			revalidatePath(`/groups/gdis/${newMember.assignedGDIId}/manage`);
		}

		return {
			success: true,
			message: `Miembro ${newMember.firstName} ${newMember.lastName} agregado exitosamente. Roles calculados.`,
			newMember,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al guardar miembro: ${error.message}`,
		};
	}
}

export async function updateMemberAction(
	updatedMemberData: Member,
): Promise<{ success: boolean; message: string; updatedMember?: Member }> {
	if (!updatedMemberData.id) {
		return {
			success: false,
			message: "Error: ID de miembro es requerido para actualizar.",
		};
	}
	try {
		const originalMemberData = await getMemberById(updatedMemberData.id);
		if (!originalMemberData) {
			return {
				success: false,
				message: `Error: Miembro con ID ${updatedMemberData.id} no encontrado.`,
			};
		}

		const memberToUpdate = await updateMember(
			updatedMemberData.id,
			updatedMemberData,
		);
		if (!memberToUpdate) {
			return {
				success: false,
				message: `Error: Miembro con ID ${updatedMemberData.id} no encontrado.`,
			};
		}

		// Sync GDI assignment if changed
		const oldGdiId = originalMemberData.assignedGDIId;
		const newGdiId = updatedMemberData.assignedGDIId;
		if (oldGdiId !== newGdiId) {
			if (oldGdiId) {
				await gdisService.removeMember(oldGdiId, updatedMemberData.id);
			}
			if (newGdiId) {
				await gdisService.assignMember(newGdiId, updatedMemberData.id);
			}
		}

		// Sync Area assignments if changed
		const oldAreaIds = new Set(originalMemberData.assignedAreaIds || []);
		const newAreaIds = new Set(updatedMemberData.assignedAreaIds || []);
		const areasToRemove = [...oldAreaIds].filter((id) => !newAreaIds.has(id));
		const areasToAdd = [...newAreaIds].filter((id) => !oldAreaIds.has(id));
		await Promise.all([
			...areasToRemove.map((areaId) =>
				areasService.removeMember(areaId, updatedMemberData.id)
			),
			...areasToAdd.map((areaId) =>
				areasService.assignMember(areaId, updatedMemberData.id)
			),
		]);

		revalidatePath("/members");
		revalidatePath("/groups");
		const allPotentiallyAffectedAreaIds = new Set([
			...(originalMemberData.assignedAreaIds || []),
			...(memberToUpdate.assignedAreaIds || []),
		]);
		allPotentiallyAffectedAreaIds.forEach((areaId) =>
			revalidatePath(`/groups/ministry-areas/${areaId}/admin`),
		);
		if (originalMemberData.assignedGDIId)
			revalidatePath(`/groups/gdis/${originalMemberData.assignedGDIId}/admin`);
		if (
			memberToUpdate.assignedGDIId &&
			memberToUpdate.assignedGDIId !== originalMemberData.assignedGDIId
		)
			revalidatePath(`/groups/gdis/${memberToUpdate.assignedGDIId}/admin`);

		const finalUpdatedMember = await getMemberById(memberToUpdate.id);

		return {
			success: true,
			message: `Miembro ${memberToUpdate.firstName} ${memberToUpdate.lastName} actualizado exitosamente. Roles actualizados.`,
			updatedMember: finalUpdatedMember || undefined,
		};
	} catch (error: any) {
		console.error("Error actualizando miembro:", error);
		return {
			success: false,
			message: `Error al actualizar miembro: ${error.message}`,
		};
	}
}

export async function deleteMemberAction(
	memberId: string,
): Promise<{ success: boolean; message: string }> {
	if (!memberId) {
		return {
			success: false,
			message: "Error: ID de miembro es requerido para eliminar.",
		};
	}
	try {
		const deletedMember = await deleteMember(memberId);
		if (!deletedMember) {
			return {
				success: false,
				message: `Error: Miembro con ID ${memberId} no encontrado.`,
			};
		}

		// Revalida las rutas para refrescar los datos en toda la aplicación.
		revalidatePath("/members");
		revalidatePath("/groups");
		// Revalida las páginas de administración de los grupos afectados.
		if (deletedMember.assignedGDIId)
			revalidatePath(`/groups/gdis/${deletedMember.assignedGDIId}/admin`);
		deletedMember.assignedAreaIds?.forEach((areaId) =>
			revalidatePath(`/groups/ministry-areas/${areaId}/admin`),
		);

		return {
			success: true,
			message: `Miembro ${deletedMember.firstName} ${deletedMember.lastName} eliminado exitosamente.`,
		};
	} catch (error: any) {
		console.error("Error eliminando miembro:", error);
		return {
			success: false,
			message: `Error al eliminar miembro: ${error.message}`,
		};
	}
}

export async function addBulkMembersAction(
	stagedMembersData: MemberWriteData[],
): Promise<{ success: boolean; message: string }> {
	try {
		const addedMembers: Member[] = [];
		for (const memberData of stagedMembersData) {
			const newMember = await addMember(memberData);

			// Assign member to GDI if specified
			if (memberData.assignedGDIId) {
				await gdisService.assignMember(memberData.assignedGDIId, newMember.id);
			}

			// Assign member to Areas if specified
			if (memberData.assignedAreaIds?.length) {
				await Promise.all(
					memberData.assignedAreaIds.map((areaId) =>
						areasService.assignMember(areaId, newMember.id)
					)
				);
			}

			addedMembers.push(newMember);
		}

		revalidatePath("/members");
		revalidatePath("/members/bulk-add");
		revalidatePath("/groups");

		return {
			success: true,
			message: `${addedMembers.length} miembro(s) guardado(s) exitosamente.`,
		};
	} catch (error: any) {
		console.error("Error saving bulk members:", error);
		return {
			success: false,
			message: `Error al guardar miembros: ${error.message}`,
		};
	}
}
