"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
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
import { ExportButton } from "@/components/ui/export-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { AttendanceRecord, Meeting, MeetingInstanceFormValues, MeetingSeries } from "@/lib/types";

/**
 * Attendee info for attendance tracking
 */
interface AttendeeInfo {
	id: string;
	firstName: string;
	lastName: string;
}

/**
 * Props for the shared Meeting Attendance Page Content component
 * 
 * This component encapsulates all the UI logic for taking attendance,
 * allowing it to be reused across different routing contexts:
 * - /events/[meetingId]/attendance (general events)
 * - /groups/gdis/[gdiId]/meetings/[meetingId]/attendance
 * - /groups/ministry-areas/[areaId]/meetings/[meetingId]/attendance
 */
export interface MeetingAttendancePageContentProps {
	/** The meeting instance data */
	meetingInstance: Meeting;
	/** The series this meeting belongs to (optional) */
	meetingSeries?: MeetingSeries;
	/** List of members expected to attend */
	attendees: AttendeeInfo[];
	/** Current attendance records for this meeting */
	currentAttendance: AttendanceRecord[];
	/** Back navigation configuration */
	backLink: string;
	backLinkText: string;
	/** Server actions for mutations */
	saveAttendanceAction: (
		meetingId: string,
		memberAttendances: Array<{ memberId: string; attended: boolean }>,
	) => Promise<{ success: boolean; message: string }>;
	updateMinuteAction: (
		meetingId: string,
		minute: string,
	) => Promise<{ success: boolean; message: string }>;
	updateInstanceAction: (
		instanceId: string,
		data: MeetingInstanceFormValues,
	) => Promise<{ success: boolean; message: string; updatedInstance?: Meeting }>;
	deleteInstanceAction: (
		instanceId: string,
	) => Promise<{ success: boolean; message: string }>;
	/** Path to redirect after deleting the instance */
	redirectOnDeletePath: string;
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

// ─── Export helpers ────────────────────────────────────────────────────────

async function handleExportPdf(
	meetingInstance: Meeting,
	seriesName: string,
	attendees: Array<{ id: string; firstName: string; lastName: string }>,
	currentAttendance: AttendanceRecord[],
) {
	const { generateAttendanceListPdf } = await import(
		"@/lib/print/templates/attendance-list.template"
	);
	generateAttendanceListPdf({
		meetingName: meetingInstance.name,
		seriesName,
		date: meetingInstance.date,
		time: meetingInstance.time,
		location: meetingInstance.location,
		attendees: attendees.map((a) => {
			const record = currentAttendance.find((r) => r.memberId === a.id);
			return {
				firstName: a.firstName,
				lastName: a.lastName,
				attended: record ? record.attended : undefined,
			};
		}),
	});
}

async function handleExportExcel(
	meetingInstance: Meeting,
	seriesName: string,
	attendees: Array<{ id: string; firstName: string; lastName: string }>,
	currentAttendance: AttendanceRecord[],
) {
	const { generateAttendanceListExcel } = await import(
		"@/lib/print/templates/attendance-list.template"
	);
	generateAttendanceListExcel({
		meetingName: meetingInstance.name,
		seriesName,
		date: meetingInstance.date,
		time: meetingInstance.time,
		location: meetingInstance.location,
		attendees: attendees.map((a) => {
			const record = currentAttendance.find((r) => r.memberId === a.id);
			return {
				firstName: a.firstName,
				lastName: a.lastName,
				attended: record ? record.attended : undefined,
			};
		}),
	});
}

/**
 * Shared component for meeting attendance page content.
 * 
 * Follows architecture rules:
 * - Receives data via props (data fetching happens in page.tsx)
 * - Receives server actions via props (allows context-specific revalidation)
 * - Pure presentation + client-side interaction
 */
export default function MeetingAttendancePageContent({
	meetingInstance,
	meetingSeries,
	attendees,
	currentAttendance,
	backLink,
	backLinkText,
	saveAttendanceAction,
	updateMinuteAction,
	updateInstanceAction,
	deleteInstanceAction,
	redirectOnDeletePath,
}: MeetingAttendancePageContentProps) {
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();

	const seriesName = meetingSeries ? meetingSeries.name : "Serie Desconocida";
	const pageTitle = `${meetingInstance.name} - ${seriesName}`;
	const meetingDateTime = `${formatDateDisplay(meetingInstance.date)} a las ${meetingInstance.time}`;
	const meetingLocation = meetingInstance.location;

	const handleMinuteSubmit = async (formData: FormData) => {
		const minuteContent = formData.get("minuteContent") as string;
		startTransition(async () => {
			const result = await updateMinuteAction(meetingInstance.id, minuteContent);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

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
				<div className="flex flex-wrap gap-2">
					<ExportButton
						label="Imprimir lista"
						onPdf={() => handleExportPdf(meetingInstance, seriesName, attendees, currentAttendance)}
						onExcel={() => handleExportExcel(meetingInstance, seriesName, attendees, currentAttendance)}
					/>
					<ManageMeetingInstanceDialog
						instance={meetingInstance}
						series={meetingSeries}
						updateInstanceAction={updateInstanceAction}
						deleteInstanceAction={deleteInstanceAction}
						redirectOnDeletePath={redirectOnDeletePath}
						triggerButton={
							<Button variant="outline">
								<Settings className="mr-2 h-4 w-4" /> Gestionar Reunión
							</Button>
						}
					/>
				</div>
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
				initialAttendees={attendees}
				initialAttendanceRecords={currentAttendance}
				saveAttendanceAction={saveAttendanceAction}
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
					<form action={handleMinuteSubmit}>
						<Textarea
							name="minuteContent"
							defaultValue={meetingInstance.minute || ""}
							placeholder="Escriba la minuta aquí..."
							rows={8}
							className="mb-4"
							disabled={isPending}
						/>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Guardando..." : "Guardar Minuta"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
