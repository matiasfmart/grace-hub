import { format } from "date-fns";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import MeetingAttendancePageContent from "@/components/events/meeting-attendance-page-content";
import type { Meeting, MeetingInstanceFormValues } from "@/lib/types";
import {
	getAttendanceForMeeting,
	saveMeetingAttendance,
	deleteMeetingInstance,
	getMeetingById,
	getMeetingSeriesById,
	getMinistryAreaById,
	updateMeeting,
	updateMeetingMinute,
	getExpectedAttendees,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AreaMeetingAttendancePageProps {
	params: Promise<{
		areaId: string;
		meetingId: string;
	}>;
}

/**
 * Get page data with validation that meeting belongs to this Area
 */
async function getPageData(areaId: string, meetingId: string) {
	// Fetch meeting and Area in parallel
	const [meetingInstance, area] = await Promise.all([
		getMeetingById(meetingId),
		getMinistryAreaById(areaId),
	]);

	if (!meetingInstance) notFound();
	if (!area) notFound();

	// Get the series to validate ownership
	const meetingSeries = await getMeetingSeriesById(meetingInstance.seriesId);

	// Validate that this meeting belongs to this Area
	if (
		!meetingSeries ||
		meetingSeries.seriesType !== "ministryArea" ||
		meetingSeries.ownerGroupId !== areaId
	) {
		// Meeting doesn't belong to this Area - redirect to correct context
		redirect(`/events/${meetingId}/attendance`);
	}

	// Fetch attendance data
	const [expectedAttendees, currentAttendance] = await Promise.all([
		getExpectedAttendees(meetingId),
		getAttendanceForMeeting(meetingId),
	]);

	// Map ExpectedAttendee to AttendeeInfo format
	const attendeesForView = expectedAttendees.map((a) => ({
		id: a.memberId,
		firstName: a.firstName,
		lastName: a.lastName,
	}));

	return {
		meetingInstance,
		meetingSeries,
		area,
		currentAttendance,
		attendees: attendeesForView,
	};
}

// ==============================================
// SERVER ACTIONS (with Area-context revalidation)
// ==============================================

async function handleSaveAttendance(
	meetingId: string,
	memberAttendances: Array<{ memberId: string; attended: boolean }>,
) {
	"use server";
	try {
		await saveMeetingAttendance(meetingId, memberAttendances);

		// Get meeting to find the Area for revalidation
		const meeting = await getMeetingById(meetingId);
		if (meeting) {
			const series = await getMeetingSeriesById(meeting.seriesId);
			if (series?.ownerGroupId) {
				revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/meetings/${meetingId}/attendance`);
				revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/admin`);
			}
		}

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

		// Revalidate Area context
		const meeting = await getMeetingById(meetingId);
		if (meeting) {
			const series = await getMeetingSeriesById(meeting.seriesId);
			if (series?.ownerGroupId) {
				revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/meetings/${meetingId}/attendance`);
			}
		}

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
		const updatedInstance = await updateMeeting(instanceId, instanceDataToUpdate);
		if (!updatedInstance) {
			return {
				success: false,
				message: `Error: Instancia con ID ${instanceId} no encontrada.`,
			};
		}

		// Revalidate Area context
		const series = await getMeetingSeriesById(updatedInstance.seriesId);
		if (series?.ownerGroupId) {
			revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/meetings/${instanceId}/attendance`);
			revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/admin`);
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

		const series = await getMeetingSeriesById(instance.seriesId);
		await deleteMeetingInstance(instanceId);

		// Revalidate Area context
		if (series?.ownerGroupId) {
			revalidatePath(`/groups/ministry-areas/${series.ownerGroupId}/admin`);
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

export default async function AreaMeetingAttendancePage({
	params,
}: AreaMeetingAttendancePageProps) {
	const { areaId, meetingId } = await params;
	const {
		meetingInstance,
		meetingSeries,
		area,
		currentAttendance,
		attendees,
	} = await getPageData(areaId, meetingId);

	const backLink = `/groups/ministry-areas/${areaId}/admin`;
	const backLinkText = `Volver a ${area.name}`;
	const redirectOnDeletePath = backLink;

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
			redirectOnDeletePath={redirectOnDeletePath}
		/>
	);
}
