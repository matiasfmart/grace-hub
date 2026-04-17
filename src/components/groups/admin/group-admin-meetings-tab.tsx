"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	CalendarDays,
	ChevronRight,
	Clock,
	MapPin,
	MoreHorizontal,
	Plus,
	Settings,
	ClipboardList,
	Eye,
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddOccasionalMeetingDialog from "@/components/events/add-occasional-meeting-dialog";
import ManageMeetingSeriesDialog from "@/components/events/manage-meeting-series-dialog";
import PageSpecificAddMeetingDialog from "@/components/events/page-specific-add-meeting-dialog";
import type {
	AttendanceRecord,
	DefineMeetingSeriesFormValues,
	Meeting,
	MeetingSeries,
	Member,
	UpdateMeetingSeriesFormValues,
} from "@/lib/types";

interface GroupAdminMeetingsTabProps {
	groupId: string;
	groupType: "gdi" | "area";
	meetingSeries: MeetingSeries[];
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	members: Member[];
	onCreateSeries: (data: DefineMeetingSeriesFormValues) => Promise<{ success: boolean; message: string }>;
	onUpdateSeries: (seriesId: string, data: UpdateMeetingSeriesFormValues) => Promise<{ success: boolean; message: string }>;
	onDeleteSeries: (seriesId: string) => Promise<{ success: boolean; message: string }>;
	onAddMeeting: (seriesId: string, data: any) => Promise<{ success: boolean; message: string }>;
	onSeriesChanged: (newSeriesId?: string) => void;
}

const frequencyLabels: Record<string, string> = {
	OneTime: "Única vez",
	Weekly: "Semanal",
	Monthly: "Mensual",
};

export default function GroupAdminMeetingsTab({
	groupId,
	groupType,
	meetingSeries,
	allMeetings,
	allAttendanceRecords,
	members,
	onCreateSeries,
	onUpdateSeries,
	onDeleteSeries,
	onAddMeeting,
	onSeriesChanged,
}: GroupAdminMeetingsTabProps) {
	const [expandedSeries, setExpandedSeries] = useState<string[]>(
		meetingSeries.length > 0 ? [meetingSeries[0].id] : []
	);

	// Group meetings by series
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
		const presentCount = records.filter(r => r.wasPresent).length;
		const expectedCount = meeting.attendeeUids?.length || members.length;
		const percentage = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0;
		return { presentCount, expectedCount, percentage };
	};

	const handleSeriesDeleted = () => {
		onSeriesChanged();
	};

	return (
		<div className="space-y-4">
			{/* Header with add series button */}
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-medium">Series de Reuniones</h3>
					<p className="text-sm text-muted-foreground">
						Administre las series de reuniones y sus instancias
					</p>
				</div>
				<PageSpecificAddMeetingDialog
					defineMeetingSeriesAction={onCreateSeries}
					seriesTypeContext={groupType}
					ownerGroupIdContext={groupId}
					onSeriesDefined={onSeriesChanged}
				/>
			</div>

			{/* Series list with accordion */}
			{meetingSeries.length > 0 ? (
				<Accordion
					type="multiple"
					value={expandedSeries}
					onValueChange={setExpandedSeries}
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
								className="border rounded-lg px-4"
							>
								<AccordionTrigger className="hover:no-underline py-4">
									<div className="flex items-center justify-between w-full mr-4">
										<div className="flex items-center gap-3">
											<CalendarDays className="h-5 w-5 text-primary" />
											<div className="text-left">
												<div className="font-medium">{series.name}</div>
												<div className="flex items-center gap-3 text-xs text-muted-foreground">
													<span className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{series.defaultTime}
													</span>
													<span className="flex items-center gap-1">
														<MapPin className="h-3 w-3" />
														{series.defaultLocation}
													</span>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="outline">
												{frequencyLabels[series.frequency] || series.frequency}
											</Badge>
											<Badge variant="secondary">
												{seriesMeetings.length} reuniones
											</Badge>
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="pb-4">
									<div className="space-y-4">
										{/* Series actions */}
										<div className="flex gap-2 flex-wrap">
											<AddOccasionalMeetingDialog
												series={series}
												addOccasionalMeetingAction={(seriesId, formData) =>
													onAddMeeting(seriesId, formData)
												}
												onSuccess={() => onSeriesChanged()}
											/>
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

										{/* Meetings list */}
										{seriesMeetings.length > 0 ? (
											<div className="space-y-2">
												{/* Upcoming meetings first */}
												{upcomingMeetings.length > 0 && (
													<div className="space-y-1">
														<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
															Próximas
														</p>
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
													</div>
												)}

												{/* Past meetings */}
												{pastMeetings.length > 0 && (
													<div className="space-y-1 mt-3">
														<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
															Pasadas
														</p>
														{pastMeetings.slice(0, 5).map(meeting => (
															<MeetingRow
																key={meeting.id}
																meeting={meeting}
																stats={getAttendanceStats(meeting)}
																isUpcoming={false}
																groupType={groupType}
																groupId={groupId}
															/>
														))}
														{pastMeetings.length > 5 && (
															<p className="text-xs text-muted-foreground text-center py-2">
																+{pastMeetings.length - 5} reuniones anteriores
															</p>
														)}
													</div>
												)}
											</div>
										) : (
											<p className="text-sm text-muted-foreground text-center py-4">
												No hay reuniones en esta serie
											</p>
										)}
									</div>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			) : (
				<div className="text-center py-12 border rounded-lg">
					<CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-medium mb-2">No hay series de reuniones</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Cree una nueva serie para comenzar a programar reuniones
					</p>
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
	groupType: "gdi" | "area";
	groupId: string;
}) {
	const attendanceLink = `/events/${meeting.id}`;

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
								? "bg-green-50 text-green-700 border-green-200"
								: stats.percentage >= 60
									? "bg-yellow-50 text-yellow-700 border-yellow-200"
									: "bg-red-50 text-red-700 border-red-200"
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
