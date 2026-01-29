"use server";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import type {
	DefineMeetingSeriesFormValues,
	Meeting,
	MeetingInstanceFormValues,
	MeetingSeries,
	MinistryArea,
} from "@/lib/types";
import {
	addMeetingInstanceForGroup,
	addMeetingSeriesForGroup,
	deleteMeetingInstanceForGroup,
	deleteMeetingSeriesForGroup,
	updateMeetingInstanceForGroup,
	updateMeetingInstanceMinuteForGroup,
	updateMeetingSeriesForGroup,
	bulkRecalculateAndUpdateRoles,
	updateMinistryAreaAndSyncMembers,
	getMinistryAreaById,
} from "@/lib/api/services";

// --- Ministry Area Detail Actions ---
export async function updateMinistryAreaDetailsAction(
	areaId: string,
	updatedData: Partial<
		Pick<MinistryArea, "leaderId" | "memberIds" | "name" | "description">
	>,
): Promise<{ success: boolean; message: string; updatedArea?: MinistryArea }> {
	try {
		// Get original Area before update
		const original = await getMinistryAreaById(areaId);
		const prevLeaderId = original?.leaderId;
		const prevMemberIds = original?.memberIds || [];

		const updatedArea = await updateMinistryAreaAndSyncMembers(
			areaId,
			updatedData,
		);

		// Collect all affected member IDs (previous and new leader/member IDs)
		const affectedMemberIds = new Set(
			[
				prevLeaderId,
				...(prevMemberIds || []),
				updatedArea?.leaderId,
				...(updatedArea?.memberIds || []),
			].filter((id): id is string => Boolean(id)),
		);
		if (affectedMemberIds.size > 0) {
			await bulkRecalculateAndUpdateRoles(Array.from(affectedMemberIds));
		}

		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		revalidatePath("/groups");
		revalidatePath("/members");

		return {
			success: true,
			message: `Área Ministerial "${updatedArea?.name}" actualizada exitosamente. Asignaciones y roles sincronizados.`,
			updatedArea: updatedArea || undefined,
		};
	} catch (error: any) {
		console.error("Error actualizando Área Ministerial y asignaciones:", error);
		return {
			success: false,
			message: `Error actualizando Área Ministerial: ${error.message}`,
		};
	}
}

// --- Ministry Area Meeting Series Actions ---
export async function handleAddAreaMeetingSeriesAction(
	areaId: string,
	seriesData: DefineMeetingSeriesFormValues,
): Promise<{
	success: boolean;
	message: string;
	newSeries?: MeetingSeries;
	newInstances?: Meeting[];
}> {
	try {
		const result = await addMeetingSeriesForGroup(
			"ministryArea",
			areaId,
			seriesData,
		);
		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		return {
			success: true,
			message: result.message,
			newSeries: result.series,
			newInstances: result.newInstances,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al definir serie para Área: ${error.message}`,
		};
	}
}

export async function handleUpdateAreaMeetingSeriesAction(
	areaId: string,
	seriesId: string,
	updatedData: DefineMeetingSeriesFormValues,
): Promise<{
	success: boolean;
	message: string;
	updatedSeries?: MeetingSeries;
	newlyGeneratedInstances?: Meeting[];
}> {
	try {
		const result = await updateMeetingSeriesForGroup(
			"ministryArea",
			areaId,
			seriesId,
			updatedData,
		);
		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		return {
			success: true,
			message: result.message,
			updatedSeries: result.updatedSeries,
			newlyGeneratedInstances: result.newlyGeneratedInstances,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al actualizar serie para Área: ${error.message}`,
		};
	}
}

export async function handleDeleteAreaMeetingSeriesAction(
	areaId: string,
	seriesId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await deleteMeetingSeriesForGroup(seriesId);
		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		return {
			success: true,
			message:
				"Serie de reuniones del Área Ministerial eliminada exitosamente.",
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al eliminar serie del Área: ${error.message}`,
		};
	}
}

// --- Ministry Area Meeting Instance Actions ---
export async function handleAddMeetingForCurrentAreaAction(
	areaId: string,
	seriesId: string,
	formData: MeetingInstanceFormValues,
): Promise<{ success: boolean; message: string; newInstance?: Meeting }> {
	if (!formData.time || !/^[0-2][0-9]:[0-5][0-9]$/.test(formData.time)) {
		return {
			success: false,
			message: "Formato de hora proporcionado es inválido o está vacío.",
		};
	}
	try {
		const newInstance = await addMeetingInstanceForGroup(
			"ministryArea",
			areaId,
			seriesId,
			formData,
		);
		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		return {
			success: true,
			message: `Reunión para Área "${newInstance.name}" agregada.`,
			newInstance,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al agregar reunión para Área: ${error.message}`,
		};
	}
}

export async function handleUpdateAreaMeetingInstanceAction(
	areaId: string,
	instanceId: string,
	data: MeetingInstanceFormValues,
): Promise<{ success: boolean; message: string; updatedInstance?: Meeting }> {
	if (!data.time || !/^[0-2][0-9]:[0-5][0-9]$/.test(data.time)) {
		return {
			success: false,
			message: "Formato de hora proporcionado es inválido o está vacío.",
		};
	}
	try {
		const instanceDataToUpdate = {
			name: data.name,
			date: format(data.date, "yyyy-MM-dd"),
			time: data.time,
			location: data.location,
			description: data.description,
		};
		const updatedInstance = await updateMeetingInstanceForGroup(
			instanceId,
			instanceDataToUpdate,
		);
		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		revalidatePath(`/events/${instanceId}/attendance`);
		return {
			success: true,
			message: "Instancia de reunión del Área actualizada.",
			updatedInstance: updatedInstance || undefined,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al actualizar instancia del Área: ${error.message}`,
		};
	}
}

export async function handleDeleteAreaMeetingInstanceAction(
	areaId: string,
	instanceId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await deleteMeetingInstanceForGroup(instanceId);
		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		return {
			success: true,
			message: "Instancia de reunión del Área eliminada.",
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al eliminar instancia del Área: ${error.message}`,
		};
	}
}

export async function handleUpdateAreaMeetingMinuteAction(
	areaId: string,
	instanceId: string,
	minute: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await updateMeetingInstanceMinuteForGroup(instanceId, minute);
		revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
		revalidatePath(`/events/${instanceId}/attendance`);
		return {
			success: true,
			message: "Minuta de reunión del Área actualizada.",
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al actualizar minuta del Área: ${error.message}`,
		};
	}
}

