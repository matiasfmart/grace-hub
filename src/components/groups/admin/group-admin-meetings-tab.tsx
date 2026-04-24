"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	AlertTriangle,
	CalendarCheck,
	CalendarDays,
	ChevronRight,
	Clock,
	LayoutGrid,
	MapPin,
	MoreHorizontal,
	Percent,
	Plus,
	Settings,
	ClipboardList,
	Eye,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import AddOccasionalMeetingDialog from "@/components/events/add-occasional-meeting-dialog";
import ManageMeetingSeriesDialog from "@/components/events/manage-meeting-series-dialog";
import PageSpecificAddMeetingDialog from "@/components/events/page-specific-add-meeting-dialog";
import GroupAttendanceTable from "@/components/groups/admin/group-attendance-table";
import type {
	AttendanceRecord,
	DefineMeetingSeriesFormValues,
	Meeting,
	MeetingSeries,
	Member,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface GroupAdminMeetingsTabProps {
	groupId: string;
	groupType: "gdi" | "ministryArea";
	meetingSeries: MeetingSeries[];
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	members: Member[];
	leaderId?: string; // guideId for GDI, leaderId for Area
	onCreateSeries: (data: DefineMeetingSeriesFormValues) => Promise<{ success: boolean; message: string }>;
	onUpdateSeries: (seriesId: string, data: any) => Promise<{ success: boolean; message: string }>;
	onDeleteSeries: (seriesId: string) => Promise<{ success: boolean; message: string }>;
	onAddMeeting: (seriesId: string, data: any) => Promise<{ success: boolean; message: string }>;
	onSeriesChanged: (newSeriesId?: string) => void;
}

const frequencyLabels: Record<string, string> = {
	OneTime: "Única vez",
	Weekly: "Semanal",
	Monthly: "Mensual",
};

const frequencyStyles: Record<string, string> = {
	OneTime: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/40",
	Weekly: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
	Monthly: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
};

export default function GroupAdminMeetingsTab({
	groupId,
	groupType,
	meetingSeries,
	allMeetings,
	allAttendanceRecords,
	members,
	leaderId,
	onCreateSeries,
	onUpdateSeries,
	onDeleteSeries,
	onAddMeeting,
	onSeriesChanged,
}: GroupAdminMeetingsTabProps) {
	const [selectedSeriesId, setSelectedSeriesId] = useState<string>(
		meetingSeries.length > 0 ? meetingSeries[0].id : ""
	);
	const [showSeriesManagement, setShowSeriesManagement] = useState(false);

	// Get meetings for selected series
	const selectedSeriesMeetings = useMemo(() => {
		if (!selectedSeriesId) return allMeetings;
		return allMeetings.filter(m => m.seriesId === selectedSeriesId);
	}, [allMeetings, selectedSeriesId]);

	const selectedSeries = meetingSeries.find(s => s.id === selectedSeriesId);

	// Calculate KPIs
	const kpis = useMemo(() => {
		const now = new Date();
		const thisMonth = now.getMonth();
		const thisYear = now.getFullYear();

		// Meetings this month
		const thisMonthMeetings = allMeetings.filter(m => {
			const meetingDate = new Date(m.date);
			return meetingDate.getMonth() === thisMonth && meetingDate.getFullYear() === thisYear;
		});

		// Average attendance across all meetings
		let totalRate = 0;
		let meetingsWithAttendance = 0;
		for (const meeting of allMeetings) {
			const records = allAttendanceRecords.filter(r => r.meetingId === meeting.id);
			// Deduplicar: un registro por miembro
			const memberMap = new Map<string, boolean>();
			for (const r of records) memberMap.set(r.memberId, r.attended);
			if (memberMap.size === 0) continue; // sin registros → no contar
			const uniquePresent = [...memberMap.values()].filter(Boolean).length;
			const expectedCount =
				(meeting.attendeeUids?.length ?? 0) > 0
					? meeting.attendeeUids.length
					: memberMap.size > 0 ? memberMap.size : members.length;
			if (expectedCount > 0) {
				totalRate += Math.min(100, (uniquePresent / expectedCount) * 100);
				meetingsWithAttendance++;
			}
		}
		const avgAttendance = meetingsWithAttendance > 0 ? Math.round(totalRate / meetingsWithAttendance) : 0;

		// Members at risk (attendance < 40%)
		let atRiskCount = 0;
		for (const member of members) {
			let memberExpected = 0;
			let memberPresent = 0;
			for (const meeting of allMeetings) {
				const isExpected = meeting.attendeeUids?.includes(member.id) ?? true;
				if (isExpected) {
					memberExpected++;
					const record = allAttendanceRecords.find(
						r => r.memberId === member.id && r.meetingId === meeting.id
					);
					if (record?.attended) memberPresent++;
				}
			}
			if (memberExpected > 0) {
				const rate = (memberPresent / memberExpected) * 100;
				if (rate < 40) atRiskCount++;
			}
		}

		return {
			memberCount: members.length,
			thisMonthMeetings: thisMonthMeetings.length,
			avgAttendance,
			atRiskCount,
		};
	}, [allMeetings, allAttendanceRecords, members]);

	// Group meetings by series for management accordion
	const meetingsBySeries = useMemo(() => {
		const grouped: Record<string, Meeting[]> = {};
		meetingSeries.forEach(series => {
			grouped[series.id] = allMeetings
				.filter(m => m.seriesId === series.id)
				.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
		});
		return grouped;
	}, [meetingSeries, allMeetings]);

	// Calculate attendance for a meeting
	const getAttendanceStats = (meeting: Meeting) => {
		const records = allAttendanceRecords.filter(r => r.meetingId === meeting.id);
		// Deduplicar: un registro por miembro
		const memberMap = new Map<string, boolean>();
		for (const r of records) memberMap.set(r.memberId, r.attended);
		const presentCount = [...memberMap.values()].filter(Boolean).length;
		const expectedCount =
			(meeting.attendeeUids?.length ?? 0) > 0
				? meeting.attendeeUids.length
				: memberMap.size > 0 ? memberMap.size : members.length;
		const percentage = expectedCount > 0 ? Math.min(100, Math.round((presentCount / expectedCount) * 100)) : 0;
		return { presentCount, expectedCount, percentage };
	};

	const handleSeriesDeleted = () => {
		onSeriesChanged();
	};

	return (
		<div className="space-y-6">
			{/* KPI Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<Card className="border-l-4 border-l-primary">
					<CardContent className="p-3">
						<div className="flex items-center gap-2">
							<div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
								<Users className="h-4 w-4 text-primary" />
							</div>
							<div>
								<p className="text-xl font-bold">{kpis.memberCount}</p>
								<p className="text-xs text-muted-foreground">Integrantes</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-3">
						<div className="flex items-center gap-2">
						<div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
							<CalendarCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-xl font-bold">{kpis.thisMonthMeetings}</p>
								<p className="text-xs text-muted-foreground">Este mes</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className={cn("border-l-4", kpis.avgAttendance >= 70 ? "border-l-green-500" : kpis.avgAttendance >= 50 ? "border-l-yellow-500" : "border-l-red-500")}>
					<CardContent className="p-3">
						<div className="flex items-center gap-2">
						<div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", kpis.avgAttendance >= 70 ? "bg-green-100 dark:bg-green-900/30" : kpis.avgAttendance >= 50 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-red-100 dark:bg-red-900/30")}>
							<Percent className={cn("h-4 w-4", kpis.avgAttendance >= 70 ? "text-green-600 dark:text-green-400" : kpis.avgAttendance >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400")} />
							</div>
							<div>
								<p className="text-xl font-bold">{kpis.avgAttendance}%</p>
								<p className="text-xs text-muted-foreground">Asistencia</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className={cn("border-l-4", kpis.atRiskCount > 0 ? "border-l-orange-500" : "border-l-green-500")}>
					<CardContent className="p-3">
						<div className="flex items-center gap-2">
						<div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", kpis.atRiskCount > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30")}>
							<AlertTriangle className={cn("h-4 w-4", kpis.atRiskCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")} />
							</div>
							<div>
								<p className="text-xl font-bold">{kpis.atRiskCount}</p>
								<p className="text-xs text-muted-foreground">En riesgo</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Series selector and actions */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
				<div className="flex items-center gap-2 flex-1">
					<span className="text-sm font-medium">Serie:</span>
					<Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Seleccionar serie" />
						</SelectTrigger>
						<SelectContent>
							{meetingSeries.map(series => (
								<SelectItem key={series.id} value={series.id}>
									{series.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					{selectedSeries && (
						<AddOccasionalMeetingDialog
							series={selectedSeries}
							addOccasionalMeetingAction={(seriesId, formData) =>
								onAddMeeting(seriesId, formData)
							}
							onSuccess={() => onSeriesChanged()}
						/>
					)}
					<PageSpecificAddMeetingDialog
						defineMeetingSeriesAction={onCreateSeries}
						seriesTypeContext={groupType}
						ownerGroupIdContext={groupId}
						onSeriesDefined={onSeriesChanged}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowSeriesManagement(!showSeriesManagement)}
					>
						<Settings className="h-4 w-4 mr-1" />
						Gestionar
					</Button>
				</div>
			</div>

			{/* Attendance Table */}
			{allMeetings.length > 0 ? (
				<GroupAttendanceTable
					groupId={groupId}
					groupType={groupType}
					members={members}
					meetings={selectedSeriesMeetings}
					attendanceRecords={allAttendanceRecords}
					leaderId={leaderId}
				/>
			) : (
				<div className="text-center py-12 border rounded-lg bg-muted/20">
					<CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-medium mb-2">No hay reuniones aún</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Cree una serie de reuniones para comenzar a programar
					</p>
				</div>
			)}

			{/* Series Management Accordion (collapsible) */}
			{showSeriesManagement && meetingSeries.length > 0 && (
				<div className="border-t pt-6">
					<h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
						Gestión de Series
					</h4>
					<Accordion
						type="multiple"
						defaultValue={[]}
						className="space-y-2"
					>
						{meetingSeries.map(series => {
							const seriesMeetings = meetingsBySeries[series.id] || [];
							const upcomingMeetings = seriesMeetings.filter(m => new Date(m.date) >= new Date());
							const pastMeetings = seriesMeetings.filter(m => new Date(m.date) < new Date());

							return (
								<AccordionItem
									key={series.id}
									value={series.id}
									className="rounded-lg border bg-card px-4"
								>
									<AccordionTrigger className="hover:no-underline py-3">
										<div className="flex items-center justify-between w-full mr-4">
											<div className="flex items-center gap-2">
												<CalendarDays className="h-4 w-4 text-primary" />
												<span className="font-medium text-sm">{series.name}</span>
											</div>
											<div className="flex items-center gap-2">
												<Badge className={frequencyStyles[series.frequency] || "bg-gray-100 dark:bg-gray-800"} variant="secondary">
													{frequencyLabels[series.frequency] || series.frequency}
												</Badge>
												<Badge variant="outline" className="text-xs">
													{seriesMeetings.length}
												</Badge>
											</div>
										</div>
									</AccordionTrigger>
									<AccordionContent className="pb-3">
										<div className="space-y-3">
											<div className="flex gap-2">
												<ManageMeetingSeriesDialog
													series={series}
													updateMeetingSeriesAction={(seriesId, data) =>
														onUpdateSeries(seriesId, data)
													}
													deleteMeetingSeriesAction={(seriesId) =>
														onDeleteSeries(seriesId)
													}
													seriesTypeContext={groupType}
													ownerGroupIdContext={groupId}
													onDeleteSuccess={handleSeriesDeleted}
												/>
											</div>
											{seriesMeetings.length > 0 ? (
												<div className="space-y-1">
													{upcomingMeetings.slice(0, 3).map(meeting => (
														<MeetingRow
															key={meeting.id}
															meeting={meeting}
															stats={getAttendanceStats(meeting)}
															isUpcoming
															groupType={groupType}
															groupId={groupId}
														/>
													))}
													{pastMeetings.slice(0, 3).map(meeting => (
														<MeetingRow
															key={meeting.id}
															meeting={meeting}
															stats={getAttendanceStats(meeting)}
															isUpcoming={false}
															groupType={groupType}
															groupId={groupId}
														/>
													))}
													{seriesMeetings.length > 6 && (
														<p className="text-xs text-center text-muted-foreground py-1">
															+{seriesMeetings.length - 6} más
														</p>
													)}
												</div>
											) : (
												<p className="text-sm text-muted-foreground text-center py-2">
													Sin reuniones
												</p>
											)}
										</div>
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				</div>
			)}
		</div>
	);
}

// Meeting row component
function MeetingRow({
	meeting,
	stats,
	isUpcoming,
	groupType,
	groupId,
}: {
	meeting: Meeting;
	stats: { presentCount: number; expectedCount: number; percentage: number };
	isUpcoming: boolean;
	groupType: "gdi" | "ministryArea";
	groupId: string;
}) {
	// Generate attendance link based on group context
	// This keeps the user within the group's context instead of redirecting to /events
	const attendanceLink = groupType === "gdi"
		? `/groups/gdis/${groupId}/meetings/${meeting.id}/attendance`
		: `/groups/ministry-areas/${groupId}/meetings/${meeting.id}/attendance`;

	return (
		<div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm">
			<div className="flex items-center gap-3">
				<span className="text-muted-foreground w-20">
					{format(parseISO(meeting.date), "dd MMM", { locale: es })}
				</span>
				<span className="text-muted-foreground">{meeting.time}</span>
				{meeting.location && (
					<span className="text-xs text-muted-foreground hidden sm:inline">
						• {meeting.location}
					</span>
				)}
			</div>
			<div className="flex items-center gap-3">
				{!isUpcoming && stats.expectedCount > 0 && (
					<Badge
						variant="outline"
						className={
							stats.percentage >= 80
							? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40"
							: stats.percentage >= 60
								? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/40"
								: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40"
						}
					>
						{stats.presentCount}/{stats.expectedCount} ({stats.percentage}%)
					</Badge>
				)}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-7 w-7">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link href={attendanceLink}>
								{isUpcoming ? (
									<>
										<ClipboardList className="mr-2 h-4 w-4" />
										Registrar asistencia
									</>
								) : (
									<>
										<Eye className="mr-2 h-4 w-4" />
										Ver asistencia
									</>
								)}
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
