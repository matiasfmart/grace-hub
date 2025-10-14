"use client";

import {
	endOfDay,
	format,
	isPast,
	isToday,
	isValid,
	isWithinInterval,
	parseISO,
	startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import {
	CalendarRange,
	CheckCircle2,
	Clock,
	HelpCircle,
	ListChecks,
	PieChart,
	Users,
	UserX,
	XCircle,
} from "lucide-react";
import { useMemo } from "react"; // Removed useState
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
// Removed Select, Label, DatePicker, Button, FilterIcon imports
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AttendanceRecord, Meeting, MeetingSeries } from "@/lib/types";

interface MemberAttendanceSummaryProps {
	memberId: string;
	memberName: string;
	allMeetings: Meeting[];
	allMeetingSeries: MeetingSeries[];
	allAttendanceRecords: AttendanceRecord[];
	selectedSeriesId: string; // Prop from parent
	startDate?: Date; // Prop from parent
	endDate?: Date; // Prop from parent
}

type AttendanceStatus =
	| "attended"
	| "absent"
	| "pending_past"
	| "pending_future";

interface FilteredMeetingInfo {
	meetingId: string;
	meetingName: string;
	meetingDate: string;
	seriesName: string;
	status: AttendanceStatus;
}

const formatDateRangeTextForSummary = (
	seriesName?: string,
	startDate?: Date,
	endDate?: Date,
): string => {
	let dateText = "";
	if (startDate && endDate && startDate <= endDate) {
		dateText = `entre ${format(startDate, "dd/MM/yy", { locale: es })} y ${format(endDate, "dd/MM/yy", { locale: es })}`;
	} else if (startDate) {
		dateText = `desde ${format(startDate, "dd/MM/yy", { locale: es })}`;
	} else if (endDate) {
		dateText = `hasta ${format(endDate, "dd/MM/yy", { locale: es })}`;
	}

	let seriesText = seriesName
		? `para la serie "${seriesName}"`
		: "para todas las series relevantes";
	if (seriesName === "Todas las Series Relevantes")
		seriesText = "para todas las series relevantes";

	if (dateText) {
		return `Detalle de asistencia ${seriesText}, ${dateText}.`;
	}
	return `Detalle de asistencia ${seriesText}.`;
};

export default function MemberAttendanceSummary({
	memberId,
	memberName,
	allMeetings,
	allMeetingSeries,
	allAttendanceRecords,
	selectedSeriesId, // Use prop
	startDate, // Use prop
	endDate, // Use prop
}: MemberAttendanceSummaryProps) {
	const processedMeetingData = useMemo(() => {
		const memberExpectedMeetings = allMeetings.filter((meeting) => {
			const series = allMeetingSeries.find((s) => s.id === meeting.seriesId);
			if (!series) return false;

			if (series.seriesType === "general") {
				if (series.targetAttendeeGroups.includes("allMembers")) return true;
				// For specific role-based general meetings, attendeeUids should be pre-resolved
				return meeting.attendeeUids?.includes(memberId);
			} else {
				// For 'gdi' or 'ministryArea' series
				// AttendeeUids should be pre-resolved for group meetings
				return meeting.attendeeUids?.includes(memberId);
			}
		});

		const meetingsFilteredBySeries =
			selectedSeriesId === "all"
				? memberExpectedMeetings
				: memberExpectedMeetings.filter(
						(meeting) => meeting.seriesId === selectedSeriesId,
					);

		let currentSeriesName = "Todas las Series Relevantes";
		if (selectedSeriesId !== "all") {
			const foundSeries = allMeetingSeries.find(
				(s) => s.id === selectedSeriesId,
			);
			if (foundSeries) currentSeriesName = foundSeries.name;
		}

		let meetingsFilteredByDate = meetingsFilteredBySeries;
		if (startDate && endDate && startDate <= endDate) {
			meetingsFilteredByDate = meetingsFilteredBySeries.filter((meeting) => {
				const meetingDateObj = parseISO(meeting.date);
				return (
					isValid(meetingDateObj) &&
					isWithinInterval(meetingDateObj, {
						start: startOfDay(startDate),
						end: endOfDay(endDate),
					})
				);
			});
		} else if (startDate) {
			meetingsFilteredByDate = meetingsFilteredBySeries.filter((meeting) => {
				const meetingDateObj = parseISO(meeting.date);
				return (
					isValid(meetingDateObj) && meetingDateObj >= startOfDay(startDate)
				);
			});
		} else if (endDate) {
			meetingsFilteredByDate = meetingsFilteredBySeries.filter((meeting) => {
				const meetingDateObj = parseISO(meeting.date);
				return isValid(meetingDateObj) && meetingDateObj <= endOfDay(endDate);
			});
		}

		const sortedMeetings = meetingsFilteredByDate.sort(
			(a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime(), // Most recent first
		);

		const detailedInfo: FilteredMeetingInfo[] = sortedMeetings.map(
			(meeting) => {
				const attendanceRecord = allAttendanceRecords.find(
					(record) =>
						record.meetingId === meeting.id && record.memberId === memberId,
				);
				const series = allMeetingSeries.find((s) => s.id === meeting.seriesId);
				const meetingDateObj = parseISO(meeting.date);
				let currentStatus: AttendanceStatus;

				if (isPast(meetingDateObj) && !isToday(meetingDateObj)) {
					if (attendanceRecord) {
						currentStatus = attendanceRecord.attended ? "attended" : "absent";
					} else {
						currentStatus = "pending_past";
					}
				} else {
					// Today or future
					if (attendanceRecord) {
						// If there's a record for today/future, use it
						currentStatus = attendanceRecord.attended ? "attended" : "absent";
					} else {
						// No record yet for today/future, so it's pending
						currentStatus = "pending_future";
					}
				}

				return {
					meetingId: meeting.id,
					meetingName: meeting.name,
					meetingDate: meeting.date,
					seriesName: series?.name || "Serie Desconocida",
					status: currentStatus,
				};
			},
		);

		const totalConvocations = detailedInfo.length;
		const totalAttendances = detailedInfo.filter(
			(info) => info.status === "attended",
		).length;
		const totalReportedAbsences = detailedInfo.filter(
			(info) => info.status === "absent",
		).length;
		const totalUnreportedPastAttendances = detailedInfo.filter(
			(info) => info.status === "pending_past",
		).length;

		const reportedMeetingsCount = totalAttendances + totalReportedAbsences;
		const reportedAbsenceRate =
			reportedMeetingsCount > 0
				? (totalReportedAbsences / reportedMeetingsCount) * 100
				: 0;

		return {
			detailedInfo,
			totalConvocations,
			totalAttendances,
			totalReportedAbsences,
			totalUnreportedPastAttendances,
			reportedAbsenceRate,
			relevantSeriesName: currentSeriesName,
		};
	}, [
		memberId,
		allMeetings,
		allMeetingSeries,
		allAttendanceRecords,
		selectedSeriesId,
		startDate,
		endDate,
	]);

	const summaryDescriptionText = formatDateRangeTextForSummary(
		processedMeetingData.relevantSeriesName,
		startDate,
		endDate,
	);

	const formatDateDisplay = (dateString: string) => {
		try {
			const dateObj = parseISO(dateString);
			if (!isValid(dateObj)) return dateString;
			return format(dateObj, "dd/MM/yyyy", { locale: es });
		} catch (_e) {
			return dateString;
		}
	};

	const renderAttendanceStatusIcon = (status: AttendanceStatus) => {
		switch (status) {
			case "attended":
				return (
					<TooltipTrigger asChild>
						<CheckCircle2 className="h-5 w-5 text-green-600 inline-block" />
					</TooltipTrigger>
				);
			case "absent":
				return (
					<TooltipTrigger asChild>
						<XCircle className="h-5 w-5 text-red-600 inline-block" />
					</TooltipTrigger>
				);
			case "pending_past":
				return (
					<TooltipTrigger asChild>
						<HelpCircle className="h-5 w-5 text-muted-foreground inline-block" />
					</TooltipTrigger>
				);
			case "pending_future":
				return (
					<TooltipTrigger asChild>
						<Clock className="h-5 w-5 text-primary inline-block" />
					</TooltipTrigger>
				);
			default:
				return null;
		}
	};

	const getAttendanceStatusTooltip = (status: AttendanceStatus) => {
		switch (status) {
			case "attended":
				return "Asistió";
			case "absent":
				return "Ausente (Reportado)";
			case "pending_past":
				return "Pendiente (Pasada - No informado)";
			case "pending_future":
				return "Pendiente (Futura/Hoy)";
			default:
				return "";
		}
	};

	return (
		<Card className="shadow-md">
			<CardHeader>
				<CardTitle className="font-headline text-xl text-primary flex items-center">
					<ListChecks className="mr-2 h-5 w-5" />
					Resumen de Asistencia: {memberName}
				</CardTitle>
				<CardDescription className="text-xs text-muted-foreground pt-1 flex items-center">
					<CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/80" />{" "}
					{summaryDescriptionText}
				</CardDescription>
				{/* Removed Filter UI elements */}
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
					<Card className="bg-primary/5">
						<CardHeader className="pb-2">
							<CardDescription className="text-xs font-medium flex items-center">
								<CalendarRange className="mr-2 h-4 w-4 text-primary" />
								Convocatorias (Filtradas)
							</CardDescription>
							<CardTitle className="text-3xl">
								{processedMeetingData.totalConvocations}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card className="bg-green-500/5">
						<CardHeader className="pb-2">
							<CardDescription className="text-xs font-medium flex items-center">
								<Users className="mr-2 h-4 w-4 text-green-600" />
								Asistencias (Reportadas)
							</CardDescription>
							<CardTitle className="text-3xl text-green-700">
								{processedMeetingData.totalAttendances}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card className="bg-red-500/5">
						<CardHeader className="pb-2">
							<CardDescription className="text-xs font-medium flex items-center">
								<UserX className="mr-2 h-4 w-4 text-red-600" />
								Inasistencias (Reportadas)
							</CardDescription>
							<CardTitle className="text-3xl text-red-700">
								{processedMeetingData.totalReportedAbsences}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card className="bg-yellow-500/5">
						<CardHeader className="pb-2">
							<CardDescription className="text-xs font-medium flex items-center">
								<PieChart className="mr-2 h-4 w-4 text-yellow-700" />
								Tasa Inasistencia (Reportadas)
							</CardDescription>
							<CardTitle className="text-3xl text-yellow-700">
								{processedMeetingData.reportedAbsenceRate.toFixed(0)}%
							</CardTitle>
						</CardHeader>
					</Card>
					<Card className="bg-orange-500/5">
						<CardHeader className="pb-2">
							<CardDescription className="text-xs font-medium flex items-center">
								<HelpCircle className="mr-2 h-4 w-4 text-orange-600" />
								No Reportadas (Pasadas)
							</CardDescription>
							<CardTitle className="text-3xl text-orange-700">
								{processedMeetingData.totalUnreportedPastAttendances}
							</CardTitle>
						</CardHeader>
					</Card>
				</div>

				<h3 className="text-md font-semibold mb-2">
					Detalle de Reuniones Convocadas:
				</h3>
				<ScrollArea className="h-[250px] border rounded-md">
					{processedMeetingData.detailedInfo.length > 0 ? (
						<TooltipProvider>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Reunión</TableHead>
										<TableHead>Serie</TableHead>
										<TableHead>Fecha</TableHead>
										<TableHead className="text-center">
											Estado Asistencia
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{processedMeetingData.detailedInfo.map((info) => (
										<TableRow key={info.meetingId}>
											<TableCell className="font-medium">
												{info.meetingName}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{info.seriesName}
											</TableCell>
											<TableCell>
												{formatDateDisplay(info.meetingDate)}
											</TableCell>
											<TableCell className="text-center">
												<Tooltip>
													{renderAttendanceStatusIcon(info.status)}
													<TooltipContent>
														<p>{getAttendanceStatusTooltip(info.status)}</p>
													</TooltipContent>
												</Tooltip>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TooltipProvider>
					) : (
						<div className="text-center py-10 text-muted-foreground">
							<CalendarRange className="mx-auto h-12 w-12 mb-4" />
							<p>
								No hay reuniones convocadas para {memberName} con los filtros
								actuales.
							</p>
						</div>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
