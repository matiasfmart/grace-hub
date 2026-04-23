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
	getGdiById,
	updateMeeting,
	updateMeetingMinute,
	getExpectedAttendees,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GdiMeetingAttendancePageProps {
	params: Promise<{
		gdiId: string;
		meetingId: string;
	}>;
}

/**
 * Get page data with validation that meeting belongs to this GDI
 */
async function getPageData(gdiId: string, meetingId: string) {
	// Fetch meeting and GDI in parallel
	const [meetingInstance, gdi] = await Promise.all([
		getMeetingById(meetingId),
		getGdiById(gdiId),
	]);

	if (!meetingInstance) notFound();
	if (!gdi) notFound();

	// Get the series to validate ownership
	const meetingSeries = await getMeetingSeriesById(meetingInstance.seriesId);

	// Validate that this meeting belongs to this GDI
	if (
		!meetingSeries ||
		meetingSeries.seriesType !== "gdi" ||
		meetingSeries.ownerGroupId !== gdiId
	) {
		// Meeting doesn't belong to this GDI - redirect to correct context
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
		gdi,
		currentAttendance,
		attendees: attendeesForView,
	};
}

// ==============================================
// SERVER ACTIONS (with GDI-context revalidation)
// ==============================================

async function handleSaveAttendance(
	meetingId: string,
	memberAttendances: Array<{ memberId: string; attended: boolean }>,
) {
	"use server";
	try {
		await saveMeetingAttendance(meetingId, memberAttendances);

		// Get meeting to find the GDI for revalidation
		const meeting = await getMeetingById(meetingId);
		if (meeting) {
			const series = await getMeetingSeriesById(meeting.seriesId);
			if (series?.ownerGroupId) {
				revalidatePath(`/groups/gdis/${series.ownerGroupId}/meetings/${meetingId}/attendance`);
				revalidatePath(`/groups/gdis/${series.ownerGroupId}/admin`);
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

		// Revalidate GDI context
		const meeting = await getMeetingById(meetingId);
		if (meeting) {
			const series = await getMeetingSeriesById(meeting.seriesId);
			if (series?.ownerGroupId) {
				revalidatePath(`/groups/gdis/${series.ownerGroupId}/meetings/${meetingId}/attendance`);
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

		// Revalidate GDI context
		const series = await getMeetingSeriesById(updatedInstance.seriesId);
		if (series?.ownerGroupId) {
			revalidatePath(`/groups/gdis/${series.ownerGroupId}/meetings/${instanceId}/attendance`);
			revalidatePath(`/groups/gdis/${series.ownerGroupId}/admin`);
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

		// Revalidate GDI context
		if (series?.ownerGroupId) {
			revalidatePath(`/groups/gdis/${series.ownerGroupId}/admin`);
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

export default async function GdiMeetingAttendancePage({
	params,
}: GdiMeetingAttendancePageProps) {
	const { gdiId, meetingId } = await params;
	const {
		meetingInstance,
		meetingSeries,
		gdi,
		currentAttendance,
		attendees,
	} = await getPageData(gdiId, meetingId);

	const backLink = `/groups/gdis/${gdiId}/admin`;
	const backLinkText = `Volver a ${gdi.name}`;
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
