"use server";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import type {
	DefineMeetingSeriesFormValues,
	GDI,
	Meeting,
	MeetingInstanceFormValues,
	MeetingSeries,
} from "@/lib/types";
import {
	updateGdiAndSyncMembers,
	addMeetingInstanceForGroup,
	addMeetingSeriesForGroup,
	deleteMeetingInstanceForGroup,
	deleteMeetingSeriesForGroup,
	updateMeetingInstanceForGroup,
	updateMeetingInstanceMinuteForGroup,
	updateMeetingSeriesForGroup,
	bulkRecalculateAndUpdateRoles,
	getGdiById,
} from "@/lib/api/services";

// --- GDI Detail Actions ---
export async function updateGdiDetailsAction(
	gdiIdToUpdate: string,
	updatedData: Partial<Pick<GDI, "name" | "guideId" | "memberIds">>,
): Promise<{ success: boolean; message: string; updatedGdi?: GDI }> {
	try {
		// Get original GDI before update
		const original = await getGdiById(gdiIdToUpdate);
		const prevGuideId = original?.guideId;
		const prevMemberIds = original?.memberIds || [];

		const finalMemberIds = (updatedData.memberIds || []).filter(
			(id) => id !== updatedData.guideId,
		);
		const finalDataToUpdate = {
			name: updatedData.name,
			guideId: updatedData.guideId,
			memberIds: finalMemberIds,
		};

		const updatedGdi = await updateGdiAndSyncMembers(
			gdiIdToUpdate,
			finalDataToUpdate,
		);

		// Collect all affected member IDs (previous and new guide/member IDs)
		const affectedMemberIds = new Set(
			[
				prevGuideId,
				...(prevMemberIds || []),
				updatedGdi?.guideId,
				...(updatedGdi?.memberIds || []),
			].filter((id): id is string => Boolean(id)),
		);
		if (affectedMemberIds.size > 0) {
			await bulkRecalculateAndUpdateRoles(Array.from(affectedMemberIds));
		}

		revalidatePath(`/groups/gdis/${gdiIdToUpdate}/admin`);
		revalidatePath("/groups");
		revalidatePath("/members");

		return {
			success: true,
			message: `GDI "${updatedGdi?.name}" actualizado exitosamente. Roles actualizados.`,
			updatedGdi: updatedGdi || undefined,
		};
	} catch (error: any) {
		console.error("Error actualizando GDI y asignaciones de miembros:", error);
		return {
			success: false,
			message: `Error actualizando GDI: ${error.message}`,
		};
	}
}

// --- GDI Meeting Series Actions ---
export async function handleAddGdiMeetingSeriesAction(
	gdiId: string,
	seriesData: DefineMeetingSeriesFormValues,
): Promise<{
	success: boolean;
	message: string;
	newSeries?: MeetingSeries;
	newInstances?: Meeting[];
}> {
	try {
		const result = await addMeetingSeriesForGroup("gdi", gdiId, seriesData);
		revalidatePath(`/groups/gdis/${gdiId}/admin`);
		return {
			success: true,
			message: result.message,
			newSeries: result.series,
			newInstances: result.newInstances,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al definir serie para GDI: ${error.message}`,
		};
	}
}

export async function handleUpdateGdiMeetingSeriesAction(
	gdiId: string,
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
			"gdi",
			gdiId,
			seriesId,
			updatedData,
		);
		revalidatePath(`/groups/gdis/${gdiId}/admin`);
		return {
			success: true,
			message: result.message,
			updatedSeries: result.updatedSeries,
			newlyGeneratedInstances: result.newlyGeneratedInstances,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al actualizar serie para GDI: ${error.message}`,
		};
	}
}

export async function handleDeleteGdiMeetingSeriesAction(
	gdiId: string,
	seriesId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await deleteMeetingSeriesForGroup(seriesId);
		revalidatePath(`/groups/gdis/${gdiId}/admin`);
		return {
			success: true,
			message: "Serie de reuniones del GDI eliminada exitosamente.",
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al eliminar serie del GDI: ${error.message}`,
		};
	}
}

// --- GDI Meeting Instance Actions ---
export async function handleAddMeetingForCurrentGDIAction(
	gdiId: string,
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
			"gdi",
			gdiId,
			seriesId,
			formData,
		);
		revalidatePath(`/groups/gdis/${gdiId}/admin`);
		return {
			success: true,
			message: `Reunión para GDI "${newInstance.name}" agregada.`,
			newInstance,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al agregar reunión para GDI: ${error.message}`,
		};
	}
}

export async function handleUpdateGdiMeetingInstanceAction(
	gdiId: string,
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
		revalidatePath(`/groups/gdis/${gdiId}/admin`);
		revalidatePath(`/events/${instanceId}/attendance`);
		return {
			success: true,
			message: "Instancia de reunión del GDI actualizada.",
			updatedInstance: updatedInstance || undefined,
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al actualizar instancia del GDI: ${error.message}`,
		};
	}
}

export async function handleDeleteGdiMeetingInstanceAction(
	gdiId: string,
	instanceId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await deleteMeetingInstanceForGroup(instanceId);
		revalidatePath(`/groups/gdis/${gdiId}/admin`);
		return {
			success: true,
			message: "Instancia de reunión del GDI eliminada.",
		};
	} catch (error: any) {
		return {
			success: false,
			message: `Error al eliminar instancia del GDI: ${error.message}`,
		};
	}
}

export async function handleUpdateGdiMeetingMinuteAction(
	gdiId: string,
	instanceId: string,
	minute: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await updateMeetingInstanceMinuteForGroup(instanceId, minute);
		revalidatePath(`/groups/gdis/${gdiId}/admin`);
		revalidatePath(`/events/${instanceId}/attendance`);
		return { success: true, message: "Minuta de reunión del GDI actualizada." };
	} catch (error: any) {
		return {
			success: false,
			message: `Error al actualizar minuta del GDI: ${error.message}`,
		};
	}
}

