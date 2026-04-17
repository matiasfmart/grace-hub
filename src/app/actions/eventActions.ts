"use server";

import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import type {
	AddOccasionalMeetingFormValues,
	DefineMeetingSeriesFormValues,
	Meeting,
	MeetingSeries,
	MeetingSeriesWriteData,
} from "@/lib/types";
import {
	addMeetingInstance,
	addMeetingSeries,
	deleteMeetingSeries,
	updateMeetingSeries,
} from "@/lib/api/services";

export async function defineMeetingSeriesAction(
	newSeriesData: DefineMeetingSeriesFormValues,
): Promise<{
	success: boolean;
	message: string;
	newSeries?: MeetingSeries;
	newInstances?: Meeting[];
}> {
	try {
		const oneTimeDateStr = newSeriesData.oneTimeDate instanceof Date &&
			isValid(newSeriesData.oneTimeDate)
			? format(newSeriesData.oneTimeDate, "yyyy-MM-dd")
			: undefined;

		const dataForService: MeetingSeriesWriteData = {
			...newSeriesData,
			seriesType: "general",
			audienceType: "all_active",
			ownerGroupId: null,
			gdiId: null,
			areaId: null,
			meetingTypeId: null,
			startDate: oneTimeDateStr || format(new Date(), "yyyy-MM-dd"),
			oneTimeDate: oneTimeDateStr,
		};

		const result = await addMeetingSeries(dataForService);

		revalidatePath("/events");
		let message = `Serie de reuniones "${result.series.name}" agregada exitosamente.`;
		if (result.newInstances && result.newInstances.length > 0) {
			message += ` ${result.newInstances.length} instancia(s) inicial(es) creada(s).`;
		} else if (
			result.series.frequency === "OneTime" &&
			result.newInstances &&
			result.newInstances.length === 1
		) {
			const instanceDateStr = result.newInstances[0].date;
			const parsedInstanceDate = parseISO(instanceDateStr);
			if (isValid(parsedInstanceDate)) {
				message += ` Instancia creada para el ${format(parsedInstanceDate, "d 'de' MMMM", { locale: es })}.`;
			} else {
				message += ` Instancia creada (fecha: ${instanceDateStr}).`;
			}
		}
		return {
			success: true,
			message,
			newSeries: result.series,
			newInstances: result.newInstances,
		};
	} catch (error: any) {
		console.error("Error defining meeting series:", error);
		return {
			success: false,
			message: `Error al definir serie de reuniones: ${error.message}`,
		};
	}
}

export async function updateMeetingSeriesAction(
	seriesId: string,
	updatedData: DefineMeetingSeriesFormValues,
): Promise<{
	success: boolean;
	message: string;
	updatedSeries?: MeetingSeries;
	newlyGeneratedInstances?: Meeting[];
}> {
	try {
		const seriesToWrite: Partial<MeetingSeriesWriteData> = {
			name: updatedData.name,
			description: updatedData.description,
			defaultTime: updatedData.defaultTime,
			defaultLocation: updatedData.defaultLocation,
			targetAttendeeGroups: updatedData.targetAttendeeGroups,
			frequency: updatedData.frequency,
			seriesType: "general" as const,
			ownerGroupId: null,
			oneTimeDate:
				updatedData.oneTimeDate instanceof Date &&
				isValid(updatedData.oneTimeDate)
					? format(updatedData.oneTimeDate, "yyyy-MM-dd")
					: undefined,
			weeklyDays: updatedData.weeklyDays,
			monthlyRuleType: updatedData.monthlyRuleType,
			monthlyDayOfMonth: updatedData.monthlyDayOfMonth,
			monthlyWeekOrdinal: updatedData.monthlyWeekOrdinal,
			monthlyDayOfWeek: updatedData.monthlyDayOfWeek,
		};
		const result = await updateMeetingSeries(seriesId, seriesToWrite);
		revalidatePath("/events");
		let message = `Serie de reuniones "${result.updatedSeries.name}" actualizada exitosamente.`;
		if (
			result.newlyGeneratedInstances &&
			result.newlyGeneratedInstances.length > 0
		) {
			message += ` ${result.newlyGeneratedInstances.length} nueva(s) instancia(s) futura(s) generada(s).`;
		}
		return {
			success: true,
			message,
			updatedSeries: result.updatedSeries,
			newlyGeneratedInstances: result.newlyGeneratedInstances,
		};
	} catch (error: any) {
		console.error("Error updating meeting series:", error);
		return {
			success: false,
			message: `Error al actualizar serie de reuniones: ${error.message}`,
		};
	}
}

export async function deleteMeetingSeriesAction(
	seriesId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await deleteMeetingSeries(seriesId);
		revalidatePath("/events");
		return {
			success: true,
			message:
				"Serie de reuniones eliminada exitosamente, junto con sus instancias y registros de asistencia.",
		};
	} catch (error: any) {
		console.error("Error deleting meeting series:", error);
		return {
			success: false,
			message: `Error al eliminar serie de reuniones: ${error.message}`,
		};
	}
}

export async function addOccasionalMeetingAction(
	seriesId: string,
	formData: AddOccasionalMeetingFormValues,
): Promise<{ success: boolean; message: string; newInstance?: Meeting }> {
	try {
		const newInstance = await addMeetingInstance(seriesId, {
			name: formData.name,
			date: format(formData.date, "yyyy-MM-dd"),
			time: formData.time,
			location: formData.location,
			description: formData.description,
		});
		revalidatePath("/events");
		return {
			success: true,
			message: `Instancia ocasional "${newInstance.name}" agregada exitosamente.`,
			newInstance,
		};
	} catch (error: any) {
		console.error("Error adding occasional meeting instance:", error);
		return {
			success: false,
			message: `Error al agregar instancia de reunión: ${error.message}`,
		};
	}
}
