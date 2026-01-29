import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, FileText, Settings } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import AttendanceManagerView from "@/components/events/attendance-manager-view";
import ManageMeetingInstanceDialog from "@/components/events/manage-meeting-instance-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Meeting, MeetingInstanceFormValues } from "@/lib/types";
import {
	getAttendanceForMeeting,
	getResolvedAttendees,
	saveMeetingAttendance,
	deleteMeetingInstance,
	getAllMeetingSeries,
	getMeetingById,
	getMeetingSeriesById,
	updateMeeting,
	updateMeetingMinute,
	getAllMembersNonPaginated,
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

	const [allMembers, currentAttendance] = await Promise.all([
		getAllMembersNonPaginated(),
		getAttendanceForMeeting(meetingId),
	]);

	const resolvedAttendees = await getResolvedAttendees(meetingInstance);
	return {
		meetingInstance,
		meetingSeries,
		resolvedAttendees,
		currentAttendance,
		allMembers,
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

const formatDateDisplay = (dateString: string) => {
	try {
		return format(parseISO(dateString), "EEEE, d 'de' MMMM 'de' yyyy", {
			locale: es,
		});
	} catch (_error) {
		return dateString;
	}
};

export default async function MeetingAttendancePage({
	params,
}: MeetingAttendancePageProps) {
	const { meetingId } = await params;
	const {
		meetingInstance,
		meetingSeries,
		resolvedAttendees,
		currentAttendance,
	} = await getPageData(meetingId);

	const seriesName = meetingSeries ? meetingSeries.name : "Serie Desconocida";
	const pageTitle = `${meetingInstance.name} - ${seriesName}`;
	const meetingDateTime = `${formatDateDisplay(meetingInstance.date)} a las ${meetingInstance.time}`;
	const meetingLocation = meetingInstance.location;

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
		<div className="container mx-auto py-8 px-4">
			<div className="mb-6">
				<Button asChild variant="outline">
					<Link href={backLink}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						{backLinkText}
					</Link>
				</Button>
			</div>

			<Card className="mb-8 shadow-lg">
				<CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-4">
					<div>
						<CardTitle className="font-headline text-3xl text-primary">
							{pageTitle}
						</CardTitle>
						<CardDescription className="text-md">
							{meetingDateTime} - {meetingLocation}
						</CardDescription>
					</div>
					<ManageMeetingInstanceDialog
						instance={meetingInstance}
						series={meetingSeries}
						updateInstanceAction={handleUpdateMeetingInstanceAction}
						deleteInstanceAction={handleDeleteMeetingInstanceAction}
						redirectOnDeletePath={backLink}
						triggerButton={
							<Button variant="outline">
								<Settings className="mr-2 h-4 w-4" /> Gestionar Reunión
							</Button>
						}
					/>
				</CardHeader>
				{meetingInstance.description && (
					<CardContent>
						<p className="text-muted-foreground">
							{meetingInstance.description}
						</p>
					</CardContent>
				)}
			</Card>

			<AttendanceManagerView
				meetingId={meetingInstance.id}
				initialAttendees={resolvedAttendees}
				initialAttendanceRecords={currentAttendance}
				saveAttendanceAction={handleSaveAttendance}
			/>

			<Card className="mt-8 shadow-lg">
				<CardHeader>
					<CardTitle className="font-headline text-2xl text-primary flex items-center">
						<FileText className="mr-2 h-5 w-5" /> Minuta de la Reunión
					</CardTitle>
					<CardDescription>
						Registre los puntos tratados, decisiones y acuerdos de la reunión.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						action={async (formData: FormData) => {
							"use server";
							const minuteContent = formData.get("minuteContent") as string;
							const result = await handleUpdateMinuteAction(
								meetingInstance.id,
								minuteContent,
							);
							if (!result.success) {
								console.error("Error updating minute:", result.message);
							}
						}}
					>
						<Textarea
							name="minuteContent"
							defaultValue={meetingInstance.minute || ""}
							placeholder="Escriba la minuta aquí..."
							rows={8}
							className="mb-4"
						/>
						<Button type="submit">Guardar Minuta</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
