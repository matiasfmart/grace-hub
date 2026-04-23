import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import MeetingAttendancePageContent from "@/components/events/meeting-attendance-page-content";
import type { Meeting, MeetingInstanceFormValues } from "@/lib/types";
import {
	getAttendanceForMeeting,
	saveMeetingAttendance,
	deleteMeetingInstance,
	getAllMeetingSeries,
	getMeetingById,
	getMeetingSeriesById,
	updateMeeting,
	updateMeetingMinute,
	getExpectedAttendees,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface MeetingAttendancePageProps {
	params: Promise<{ meetingId: string }>;
}

async function getPageData(meetingId: string) {
	const meetingInstance = await getMeetingById(meetingId);
	if (!meetingInstance) notFound();

	const allMeetingSeriesData = await getAllMeetingSeries();
	const meetingSeries = allMeetingSeriesData.find(
		(s) => s.id === meetingInstance.seriesId,
	);

	const [expectedAttendees, currentAttendance] = await Promise.all([
		getExpectedAttendees(meetingId),
		getAttendanceForMeeting(meetingId),
	]);

	// Map ExpectedAttendee to AttendeeInfo format (id instead of memberId)
	const attendeesForView = expectedAttendees.map((a) => ({
		id: a.memberId,
		firstName: a.firstName,
		lastName: a.lastName,
	}));

	return {
		meetingInstance,
		meetingSeries,
		currentAttendance,
		attendees: attendeesForView,
	};
}

async function handleSaveAttendance(
	meetingId: string,
	memberAttendances: Array<{ memberId: string; attended: boolean }>,
) {
	"use server";
	try {
		await saveMeetingAttendance(meetingId, memberAttendances);
		revalidatePath(`/events/${meetingId}/attendance`);
		return { success: true, message: "Asistencia guardada exitosamente." };
	} catch (error: any) {
		return {
			success: false,
			message: `Error al guardar asistencia: ${error.message}`,
		};
	}
}

async function handleUpdateMinuteAction(meetingId: string, minute: string) {
	"use server";
	try {
		await updateMeetingMinute(
			meetingId,
			minute.trim() === "" ? null : minute.trim(),
		);
		revalidatePath(`/events/${meetingId}/attendance`);
		return { success: true, message: "Minuta actualizada exitosamente." };
	} catch (error: any) {
		return {
			success: false,
			message: `Error al actualizar minuta: ${error.message}`,
		};
	}
}

async function handleUpdateMeetingInstanceAction(
	instanceId: string,
	data: MeetingInstanceFormValues,
): Promise<{ success: boolean; message: string; updatedInstance?: Meeting }> {
	"use server";
	try {
		const instanceDataToUpdate = {
			name: data.name,
			date: format(data.date, "yyyy-MM-dd"),
			time: data.time,
			location: data.location,
			description: data.description,
		};
		const updatedInstance = await updateMeeting(
			instanceId,
			instanceDataToUpdate,
		);
		if (!updatedInstance) {
			return {
				success: false,
				message: `Error: Instancia con ID ${instanceId} no encontrada.`,
			};
		}
		revalidatePath(`/events/${instanceId}/attendance`);

		const series = await getMeetingSeriesById(updatedInstance.seriesId);
		if (series?.seriesType === "gdi" && series.ownerGroupId) {
			revalidatePath(`/groups/gdis/${series.ownerGroupId}/admin`);
		} else if (series?.seriesType === "ministryArea" && series.ownerGroupId) {
			revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/admin`);
		} else {
			revalidatePath(`/events`);
		}

		return {
			success: true,
			message: "Instancia de reunión actualizada exitosamente.",
			updatedInstance,
		};
	} catch (error: any) {
		console.error("Error updating meeting instance:", error);
		return {
			success: false,
			message: `Error al actualizar instancia: ${error.message}`,
		};
	}
}

async function handleDeleteMeetingInstanceAction(
	instanceId: string,
): Promise<{ success: boolean; message: string }> {
	"use server";
	try {
		const instance = await getMeetingById(instanceId);
		if (!instance) {
			return {
				success: false,
				message: `Error: Instancia con ID ${instanceId} no encontrada.`,
			};
		}
		await deleteMeetingInstance(instanceId);
		revalidatePath(`/events/${instanceId}/attendance`);
		const series = await getMeetingSeriesById(instance.seriesId);
		if (series?.seriesType === "gdi" && series.ownerGroupId) {
			revalidatePath(`/groups/gdis/${series.ownerGroupId}/admin`);
		} else if (series?.seriesType === "ministryArea" && series.ownerGroupId) {
			revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/admin`);
		} else {
			revalidatePath(`/events`);
		}
		return {
			success: true,
			message: "Instancia de reunión eliminada exitosamente.",
		};
	} catch (error: any) {
		console.error("Error deleting meeting instance:", error);
		return {
			success: false,
			message: `Error al eliminar instancia: ${error.message}`,
		};
	}
}

// ==============================================
// PAGE COMPONENT
// ==============================================

export default async function MeetingAttendancePage({
	params,
}: MeetingAttendancePageProps) {
	const { meetingId } = await params;
	const {
		meetingInstance,
		meetingSeries,
		currentAttendance,
		attendees,
	} = await getPageData(meetingId);

	const seriesName = meetingSeries ? meetingSeries.name : "Serie Desconocida";

	// Determine back link based on meeting context
	let backLink = "/events";
	let backLinkText = "Volver a Eventos";

	if (meetingSeries) {
		if (meetingSeries.seriesType === "gdi" && meetingSeries.ownerGroupId) {
			backLink = `/groups/gdis/${meetingSeries.ownerGroupId}/admin`;
			backLinkText = `Volver a Admin GDI: ${seriesName}`;
		} else if (
			meetingSeries.seriesType === "ministryArea" &&
			meetingSeries.ownerGroupId
		) {
			backLink = `/groups/ministry-areas/${meetingSeries.ownerGroupId}/admin`;
			backLinkText = `Volver a Admin Área: ${seriesName}`;
		}
	}

	return (
		<MeetingAttendancePageContent
			meetingInstance={meetingInstance}
			meetingSeries={meetingSeries}
			attendees={attendees}
			currentAttendance={currentAttendance}
			backLink={backLink}
			backLinkText={backLinkText}
			saveAttendanceAction={handleSaveAttendance}
			updateMinuteAction={handleUpdateMinuteAction}
			updateInstanceAction={handleUpdateMeetingInstanceAction}
			deleteInstanceAction={handleDeleteMeetingInstanceAction}
			redirectOnDeletePath={backLink}
		/>
	);
}
