"use client";

import { format, isValid, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
	AlertTriangle,
	CalendarRange,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	HelpCircle,
	MinusCircle,
	Percent,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import type { AttendanceRecord, Meeting, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GroupAttendanceTableProps {
	groupId: string;
	groupType: "gdi" | "ministryArea";
	members: Member[];
	meetings: Meeting[];
	attendanceRecords: AttendanceRecord[];
	leaderId?: string; // guideId for GDI, leaderId for Area
}

// Helper: Format meeting header
const formatMeetingHeader = (dateString: string, timeString: string): string => {
	try {
		const parsedDate = parseISO(dateString);
		if (!isValid(parsedDate)) return dateString;
		return format(parsedDate, "d MMM", { locale: es });
	} catch {
		return dateString;
	}
};

// Helper: Get risk level based on attendance rate
type RiskLevel = "ok" | "warning" | "critical" | "unknown";

const getRiskLevel = (rate: number, expectedCount: number): RiskLevel => {
	if (expectedCount === 0) return "unknown";
	if (rate >= 80) return "ok";
	if (rate >= 40) return "warning";
	return "critical";
};

const getRiskBadge = (level: RiskLevel) => {
	switch (level) {
		case "ok":
			return null; // No badge needed for OK
		case "warning":
			return (
				<Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/40">
					<AlertTriangle className="h-3 w-3 mr-1" />
					Riesgo
				</Badge>
			);
		case "critical":
			return (
				<Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40">
					<AlertTriangle className="h-3 w-3 mr-1" />
					Crítico
				</Badge>
			);
		default:
			return null;
	}
};

// Helper: Get rate color class
const getRateColorClass = (rate: number): string => {
	if (rate >= 80) return "text-green-600";
	if (rate >= 60) return "text-yellow-600";
	if (rate >= 40) return "text-orange-500";
	return "text-red-600";
};

// Helper: Format "days ago" text
const formatDaysAgo = (daysAgo: number): { text: string; color: string } => {
	if (daysAgo < 0) return { text: "Sin registro", color: "text-muted-foreground" };
	if (daysAgo === 0) return { text: "Hoy", color: "text-green-600" };
	if (daysAgo === 1) return { text: "Ayer", color: "text-green-600" };
	if (daysAgo <= 7) return { text: `${daysAgo}d`, color: "text-green-600" };
	if (daysAgo <= 14) return { text: `${daysAgo}d`, color: "text-yellow-600" };
	if (daysAgo <= 30) return { text: `${daysAgo}d`, color: "text-orange-500" };
	return { text: `${daysAgo}d`, color: "text-red-600" };
};

export default function GroupAttendanceTable({
	groupId,
	groupType,
	members,
	meetings,
	attendanceRecords,
	leaderId,
}: GroupAttendanceTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// Sort meetings by date (newest first for columns, but display oldest to newest left-to-right)
	const sortedMeetings = useMemo(() => {
		return [...meetings]
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.slice(-10); // Show last 10 meetings
	}, [meetings]);

	// Sort members: Leader first, then by name
	const sortedMembers = useMemo(() => {
		return [...members].sort((a, b) => {
			// Leader always first
			if (a.id === leaderId) return -1;
			if (b.id === leaderId) return 1;
			// Then alphabetically
			return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
		});
	}, [members, leaderId]);

	// Calculate attendance rate for a member
	const calculateMemberStats = (memberId: string) => {
		let expectedCount = 0;
		let presentCount = 0;
		let pendingCount = 0;
		let lastAttendanceDate: Date | null = null;

		for (const meeting of sortedMeetings) {
			const isExpected = meeting.attendeeUids?.includes(memberId) ?? true; // Default to expected if no list
			if (isExpected) {
				expectedCount++;
				const record = attendanceRecords.find(
					(r) => r.memberId === memberId && r.meetingId === meeting.id,
				);
				if (record?.attended) {
					presentCount++;
					const meetingDate = parseISO(meeting.date);
					if (!lastAttendanceDate || meetingDate > lastAttendanceDate) {
						lastAttendanceDate = meetingDate;
					}
				} else if (!record) {
					pendingCount++;
				}
			}
		}

		const rate = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0;
		const riskLevel = getRiskLevel(rate, expectedCount);
		const daysAgo = lastAttendanceDate ? differenceInDays(new Date(), lastAttendanceDate) : -1;
		
		return { rate, present: presentCount, expected: expectedCount, pending: pendingCount, riskLevel, daysAgo };
	};

	// Generate tooltip text
	const getAttendanceTooltip = (
		memberName: string,
		status: "present" | "absent" | "pending",
		meetingDate: string,
	): string => {
		const formattedDate = format(parseISO(meetingDate), "d MMM yyyy", { locale: es });
		switch (status) {
			case "present":
				return `${memberName} - Asistió (${formattedDate})`;
			case "absent":
				return `${memberName} - No asistió (${formattedDate})`;
			case "pending":
				return `${memberName} - Pendiente (${formattedDate})`;
		}
	};

	// Pagination
	const totalMembers = sortedMembers.length;
	const totalPages = Math.ceil(totalMembers / pageSize);
	const startIndex = (currentPage - 1) * pageSize;
	const paginatedMembers = sortedMembers.slice(startIndex, startIndex + pageSize);

	// Generate attendance link based on group context
	const getAttendanceLink = (meetingId: string) => {
		return groupType === "gdi"
			? `/groups/gdis/${groupId}/meetings/${meetingId}/attendance`
			: `/groups/ministry-areas/${groupId}/meetings/${meetingId}/attendance`;
	};

	if (sortedMeetings.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-card">
				<CalendarRange className="h-10 w-10 mx-auto mb-3 opacity-50" />
				<p>No hay reuniones para mostrar</p>
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="border-2 border-border/60 rounded-xl shadow-lg bg-card overflow-hidden">
				{/* Pagination header */}
				{totalMembers > 0 && (
					<div className="flex flex-col sm:flex-row justify-between items-center p-3 border-b-2 border-border/40 gap-2 bg-gradient-to-r from-primary/5 to-primary/10">
						<div className="text-sm font-medium text-foreground">
							{paginatedMembers.length} de {totalMembers} integrantes
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Mostrar:</span>
							<Select
								value={pageSize.toString()}
								onValueChange={(v) => {
									setPageSize(Number(v));
									setCurrentPage(1);
								}}
							>
								<SelectTrigger className="w-[65px] h-8 text-xs bg-card">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="5">5</SelectItem>
									<SelectItem value="10">10</SelectItem>
									<SelectItem value="25">25</SelectItem>
								</SelectContent>
							</Select>
							{totalPages > 1 && (
								<>
									<Button
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0 bg-card"
										onClick={() => setCurrentPage((p) => p - 1)}
										disabled={currentPage <= 1}
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<span className="text-xs font-medium text-foreground">
										{currentPage}/{totalPages}
									</span>
									<Button
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0 bg-card"
										onClick={() => setCurrentPage((p) => p + 1)}
										disabled={currentPage >= totalPages}
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					</div>
				)}

				{/* Table */}
				<ScrollArea className="w-full whitespace-nowrap">
					<Table className="min-w-full">
						<TableHeader>
							<TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary/20 hover:bg-primary/10">
								<TableHead className="sticky left-0 bg-gradient-to-r from-primary/10 to-primary/5 z-20 w-[180px] min-w-[180px] border-r-2 border-primary/20 p-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
									<span className="font-semibold text-foreground">Integrante</span>
								</TableHead>
								<TableHead className="text-center min-w-[65px] p-2 bg-primary/15">
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center justify-center gap-1 cursor-help">
												<Percent className="h-3.5 w-3.5 text-primary" />
												<span className="text-xs font-semibold text-foreground">Tasa</span>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>Porcentaje de asistencia</p>
										</TooltipContent>
									</Tooltip>
								</TableHead>
								<TableHead className="text-center min-w-[80px] p-2">
									<span className="text-xs font-semibold text-foreground">Estado</span>
								</TableHead>
								<TableHead className="text-center min-w-[70px] p-2 bg-primary/15">
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center justify-center gap-1 cursor-help">
												<Clock className="h-3.5 w-3.5 text-primary" />
												<span className="text-xs font-semibold text-foreground">Última</span>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>Días desde última asistencia</p>
										</TooltipContent>
									</Tooltip>
								</TableHead>
								{sortedMeetings.map((meeting) => (
									<TableHead
										key={meeting.id}
										className="text-center min-w-[70px] p-1 whitespace-normal"
									>
										<Link
											href={getAttendanceLink(meeting.id)}
											className="hover:underline text-primary font-semibold text-xs hover:text-primary/80 transition-colors"
											title={`${meeting.name} - ${meeting.date}`}
										>
											{formatMeetingHeader(meeting.date, meeting.time)}
										</Link>
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody className="[&>tr:nth-child(even)]:bg-muted/30">
							{paginatedMembers.map((member, idx) => {
								const stats = calculateMemberStats(member.id);
								const memberFullName = `${member.firstName} ${member.lastName}`;
								const isLeader = member.id === leaderId;
								const lastAttendance = formatDaysAgo(stats.daysAgo);

								return (
									<TableRow 
										key={member.id} 
										className={cn(
											"transition-colors hover:bg-muted/50",
											isLeader && "bg-primary/5 hover:bg-primary/10",
											!isLeader && idx % 2 === 1 && "bg-muted/20"
										)}
									>
										<TableCell className="sticky left-0 z-10 font-medium w-[180px] min-w-[180px] border-r-2 border-border/40 p-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] bg-card">
											<div className="flex items-center gap-2">
												<span className={cn("truncate", isLeader && "font-semibold text-primary")}>
													{memberFullName}
												</span>
												{isLeader && (
													<Badge variant="default" className="text-xs py-0 px-1.5 bg-primary/90">
														{groupType === "gdi" ? "Guía" : "Líder"}
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell
											className="text-center p-2 bg-muted/40 font-bold"
											title={`${stats.present} de ${stats.expected} reuniones asistidas`}
										>
											{stats.expected > 0 ? (
												<span className={getRateColorClass(stats.rate)}>{stats.rate}%</span>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell className="text-center p-2">
											{getRiskBadge(stats.riskLevel)}
										</TableCell>
										<TableCell className="text-center p-2 bg-muted/40">
											<Tooltip>
												<TooltipTrigger asChild>
													<span className={cn("text-xs font-medium cursor-help", lastAttendance.color)}>
														{lastAttendance.text}
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>{stats.daysAgo >= 0 ? `Hace ${stats.daysAgo} días` : "Sin asistencia registrada"}</p>
												</TooltipContent>
											</Tooltip>
										</TableCell>
										{sortedMeetings.map((meeting) => {
											const isExpected = meeting.attendeeUids?.includes(member.id) ?? true;
											const record = attendanceRecords.find(
												(r) => r.memberId === member.id && r.meetingId === meeting.id,
											);

											let cellContent;
											let status: "present" | "absent" | "pending" = "pending";

											if (!isExpected) {
												cellContent = (
													<MinusCircle className="h-4 w-4 text-gray-300 mx-auto" />
												);
											} else if (record?.attended) {
												status = "present";
												cellContent = (
													<CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
												);
											} else if (record && !record.attended) {
												status = "absent";
												cellContent = (
													<XCircle className="h-4 w-4 text-red-600 mx-auto" />
												);
											} else {
												status = "pending";
												cellContent = (
													<HelpCircle className="h-4 w-4 text-muted-foreground mx-auto" />
												);
											}

											return (
												<TableCell
													key={`${member.id}-${meeting.id}`}
													className="text-center p-0"
												>
													<Link
														href={getAttendanceLink(meeting.id)}
														className="flex justify-center items-center h-full w-full p-1.5 hover:bg-primary/10 transition-colors rounded"
														title={isExpected ? getAttendanceTooltip(memberFullName, status, meeting.date) : "No convocado"}
													>
														{cellContent}
													</Link>
												</TableCell>
											);
										})}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>

				{/* Legend */}
				<div className="px-4 py-3 border-t-2 border-border/40 bg-gradient-to-r from-muted/30 to-muted/50">
					<div className="flex flex-wrap items-center gap-4 text-xs">
						<span className="font-semibold text-foreground">Leyenda:</span>
						<div className="flex items-center gap-1.5">
							<CheckCircle2 className="h-4 w-4 text-green-600" />
							<span className="text-muted-foreground">Asistió</span>
						</div>
						<div className="flex items-center gap-1.5">
							<XCircle className="h-4 w-4 text-red-600" />
							<span className="text-muted-foreground">No asistió</span>
						</div>
						<div className="flex items-center gap-1.5">
							<HelpCircle className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground">Pendiente</span>
						</div>
						<div className="border-l-2 border-border/60 pl-4 ml-2 flex items-center gap-3">
							<span className="font-semibold text-foreground">Estado:</span>
							<span className="text-green-600 font-medium">≥80% OK</span>
							<span className="text-yellow-600 font-medium">40-79% Riesgo</span>
							<span className="text-red-600 font-medium">&lt;40% Crítico</span>
						</div>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}
