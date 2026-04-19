"use client";

import { format, isValid, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
	CalendarRange,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Clock,
	HelpCircle,
	MinusCircle,
	MoreVertical,
	Percent,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type {
	AttendanceRecord,
	GDI,
	Meeting,
	MeetingSeries,
	Member,
	MinistryArea,
} from "@/lib/types";
import {
	NO_AREA_FILTER_VALUE,
	NO_GDI_FILTER_VALUE,
	NO_ROLE_FILTER_VALUE,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface MeetingTypeAttendanceTableProps {
	displayedInstances: Meeting[];
	allMeetingSeries: MeetingSeries[];
	initialRowMembers: Member[];
	expectedAttendeesMap: Record<string, Set<string>>;
	allAttendanceRecords: AttendanceRecord[];
	seriesName: string;
	filterStartDate?: string;
	filterEndDate?: string;
	memberCurrentPage: number;
	memberPageSize: number;
	// New filter props
	memberRoleFilters?: string[];
	memberStatusFilters?: Member["status"][];
	memberGdiFilters?: string[];
	memberAreaFilters?: string[];
	// Data for filtering
	allMembers: Member[]; // Full list of members for lookups
	allGdis: GDI[];
	allAreas: MinistryArea[];
}

const formatMeetingHeader = (
	dateString: string,
	timeString: string,
	isDuplicateDate: boolean,
): string => {
	try {
		const parsedDate = parseISO(dateString);
		if (!isValid(parsedDate))
			return isDuplicateDate ? `${dateString} ${timeString}` : dateString;

		const datePart = format(parsedDate, "d MMM yy", { locale: es });
		if (isDuplicateDate) {
			const timeParts = timeString.split(":");
			if (
				timeParts.length === 2 &&
				parseInt(timeParts[0], 10) >= 0 &&
				parseInt(timeParts[0], 10) <= 23 &&
				parseInt(timeParts[1], 10) >= 0 &&
				parseInt(timeParts[1], 10) <= 59
			) {
				return `${datePart} ${timeString}`;
			}
			return `${datePart} (Hora: ${timeString})`;
		}
		return datePart;
	} catch (_error) {
		return isDuplicateDate ? `${dateString} ${timeString}` : dateString;
	}
};

const formatDateRangeText = (startDate?: string, endDate?: string): string => {
	if (startDate && endDate) {
		try {
			const parsedStart = parseISO(startDate);
			const parsedEnd = parseISO(endDate);
			if (!isValid(parsedStart) || !isValid(parsedEnd))
				return "Rango de fechas inválido";
			const formattedStart = format(parsedStart, "dd/MM/yyyy", { locale: es });
			const formattedEnd = format(parsedEnd, "dd/MM/yyyy", { locale: es });
			return `Mostrando instancias entre ${formattedStart} y ${formattedEnd}`;
		} catch (_e) {
			return "Rango de fechas inválido";
		}
	}
	return `Mostrando todas las instancias para esta serie.`;
};

export default function MeetingTypeAttendanceTable({
	displayedInstances,
	allMeetingSeries,
	initialRowMembers,
	expectedAttendeesMap,
	allAttendanceRecords,
	seriesName,
	filterStartDate,
	filterEndDate,
	memberCurrentPage,
	memberPageSize,
	memberRoleFilters = [],
	memberStatusFilters = [],
	memberGdiFilters = [],
	memberAreaFilters = [],
	allMembers, // Used for filtering
	allGdis, // Used for filtering
	allAreas, // Used for filtering
}: MeetingTypeAttendanceTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const filteredRowMembers = useMemo(() => {
		return initialRowMembers.filter((member) => {
			let roleMatch = true;
			if (memberRoleFilters.length > 0) {
				const memberRoles = member.roles || [];
				const hasNoRoleFilter =
					memberRoleFilters.includes(NO_ROLE_FILTER_VALUE);
				const actualRoleFilters = memberRoleFilters.filter(
					(r) => r !== NO_ROLE_FILTER_VALUE,
				);

				if (hasNoRoleFilter && actualRoleFilters.length > 0) {
					roleMatch =
						memberRoles.some((role) => actualRoleFilters.includes(role)) ||
						memberRoles.length === 0;
				} else if (hasNoRoleFilter) {
					roleMatch = memberRoles.length === 0;
				} else if (actualRoleFilters.length > 0) {
					roleMatch = memberRoles.some((role) =>
						actualRoleFilters.includes(role),
					);
				}
			}

			let statusMatch = true;
			if (memberStatusFilters.length > 0) {
				statusMatch = memberStatusFilters.includes(member.status);
			}

			let gdiMatch = true;
			if (memberGdiFilters.length > 0) {
				const hasNoGdiFilter = memberGdiFilters.includes(NO_GDI_FILTER_VALUE);
				const actualGdiIdFilters = memberGdiFilters.filter(
					(id) => id !== NO_GDI_FILTER_VALUE,
				);

				if (hasNoGdiFilter && actualGdiIdFilters.length > 0) {
					gdiMatch =
						!member.assignedGDIId ||
						actualGdiIdFilters.includes(member.assignedGDIId || "");
				} else if (hasNoGdiFilter) {
					gdiMatch = !member.assignedGDIId;
				} else if (actualGdiIdFilters.length > 0) {
					gdiMatch =
						!!member.assignedGDIId &&
						actualGdiIdFilters.includes(member.assignedGDIId);
				}
			}

			let areaMatch = true;
			if (memberAreaFilters.length > 0) {
				const hasNoAreaFilter =
					memberAreaFilters.includes(NO_AREA_FILTER_VALUE);
				const actualAreaIdFilters = memberAreaFilters.filter(
					(id) => id !== NO_AREA_FILTER_VALUE,
				);
				const memberAreas = member.assignedAreaIds || [];

				if (hasNoAreaFilter && actualAreaIdFilters.length > 0) {
					areaMatch =
						memberAreas.length === 0 ||
						memberAreas.some((areaId) => actualAreaIdFilters.includes(areaId));
				} else if (hasNoAreaFilter) {
					areaMatch = memberAreas.length === 0;
				} else if (actualAreaIdFilters.length > 0) {
					areaMatch = memberAreas.some((areaId) =>
						actualAreaIdFilters.includes(areaId),
					);
				}
			}

			return roleMatch && statusMatch && gdiMatch && areaMatch;
		});
	}, [
		initialRowMembers,
		memberRoleFilters,
		memberStatusFilters,
		memberGdiFilters,
		memberAreaFilters,
	]);

	// Member Pagination Logic
	const totalMembers = filteredRowMembers.length;
	const totalMemberPages = Math.ceil(totalMembers / memberPageSize);
	const memberStartIndex = (memberCurrentPage - 1) * memberPageSize;
	const memberEndIndex = memberStartIndex + memberPageSize;
	const paginatedRowMembers = filteredRowMembers.slice(
		memberStartIndex,
		memberEndIndex,
	);

	const handleMemberPageChange = (newPage: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("mPage", newPage.toString());
		router.push(`${pathname}?${params.toString()}`);
	};

	const handleMemberPageSizeChange = (newSize: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("mPSize", newSize);
		params.set("mPage", "1"); // Reset to first page when size changes
		router.push(`${pathname}?${params.toString()}`);
	};

	// Calculate attendance rate for a member across all displayed meetings
	const calculateMemberAttendanceRate = (memberId: string): { rate: number; present: number; expected: number } => {
		let expectedCount = 0;
		let presentCount = 0;

		for (const meeting of displayedInstances) {
			const isExpected = expectedAttendeesMap[meeting.id]?.has(memberId);
			if (isExpected) {
				expectedCount++;
				const record = allAttendanceRecords.find(
					(r) => r.memberId === memberId && r.meetingId === meeting.id,
				);
				if (record?.attended) {
					presentCount++;
				}
			}
		}

		const rate = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0;
		return { rate, present: presentCount, expected: expectedCount };
	};

	// Generate tooltip text with member name
	const getAttendanceTooltip = (
		memberName: string,
		status: "present" | "absent" | "pending" | "not-applicable",
		meetingDate: string,
	): string => {
		const formattedDate = format(parseISO(meetingDate), "d MMM yyyy", { locale: es });
		switch (status) {
			case "present":
				return `${memberName} - Asistió (${formattedDate})`;
			case "absent":
				return `${memberName} - No asistió (${formattedDate})`;
			case "pending":
				return `${memberName} - Pendiente de registrar (${formattedDate})`;
			case "not-applicable":
				return `${memberName} - No convocado (${formattedDate})`;
		}
	};

	// Get rate color class based on percentage
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

	// Calculate last attendance for a member
	const calculateMemberLastAttendance = (memberId: string): number => {
		let lastAttendanceDate: Date | null = null;

		for (const meeting of displayedInstances) {
			const isExpected = expectedAttendeesMap[meeting.id]?.has(memberId);
			if (isExpected) {
				const record = allAttendanceRecords.find(
					(r) => r.memberId === memberId && r.meetingId === meeting.id,
				);
				if (record?.attended) {
					const meetingDate = parseISO(meeting.date);
					if (!lastAttendanceDate || meetingDate > lastAttendanceDate) {
						lastAttendanceDate = meetingDate;
					}
				}
			}
		}

		return lastAttendanceDate ? differenceInDays(new Date(), lastAttendanceDate) : -1;
	};

	if (!displayedInstances || displayedInstances.length === 0) {
		const dateRangeInfo =
			filterStartDate && filterEndDate
				? ` para el rango de ${format(parseISO(filterStartDate), "dd/MM/yy", { locale: es })} a ${format(parseISO(filterEndDate), "dd/MM/yy", { locale: es })}`
				: "";
		return (
			<div className="border-2 border-dashed rounded-xl bg-card p-8 text-center">
				<CalendarRange className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
				<p className="text-muted-foreground">
					No hay instancias de reunión para la serie &quot;{seriesName}&quot;
					{dateRangeInfo}.
				</p>
			</div>
		);
	}

	// Sort meeting instances by date ascending (oldest first) for column display
	const columnMeetings = [...displayedInstances].sort(
		(a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
	);

	const dateCounts = new Map<string, number>();
	columnMeetings.forEach((meeting) => {
		dateCounts.set(meeting.date, (dateCounts.get(meeting.date) || 0) + 1);
	});

	const captionDateRangeText = formatDateRangeText(
		filterStartDate,
		filterEndDate,
	);

	return (
		<TooltipProvider>
			<div className="border-2 border-border/60 rounded-xl shadow-lg bg-card overflow-hidden mt-4">
				{initialRowMembers.length > 0 && (
					<div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b-2 border-border/40 gap-2 bg-gradient-to-r from-primary/5 to-primary/10">
						<div className="text-sm font-medium text-foreground">
							{paginatedRowMembers.length} de {totalMembers} miembros filtrados
							<span className="text-muted-foreground ml-1">
								(de {initialRowMembers.length} convocados)
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Mostrar:</span>
							<Select
								value={memberPageSize.toString()}
								onValueChange={handleMemberPageSizeChange}
							>
								<SelectTrigger className="w-[70px] h-8 text-xs bg-card">
									<SelectValue placeholder={memberPageSize} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="10">10</SelectItem>
									<SelectItem value="25">25</SelectItem>
									<SelectItem value="50">50</SelectItem>
								</SelectContent>
							</Select>
							{totalMemberPages > 1 && (
								<>
									<Button
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0 bg-card"
										onClick={() => handleMemberPageChange(memberCurrentPage - 1)}
										disabled={memberCurrentPage <= 1}
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<span className="text-xs font-medium text-foreground">
										{memberCurrentPage}/{totalMemberPages}
									</span>
									<Button
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0 bg-card"
										onClick={() => handleMemberPageChange(memberCurrentPage + 1)}
										disabled={memberCurrentPage >= totalMemberPages}
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					</div>
				)}
				<ScrollArea className="w-full whitespace-nowrap">
					<Table className="min-w-full">
						<TableHeader>
							<TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary/20 hover:bg-primary/10">
								<TableHead className="sticky left-0 bg-gradient-to-r from-primary/10 to-primary/5 z-20 w-[200px] min-w-[200px] border-r-2 border-primary/20 p-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
									<span className="font-semibold text-foreground">Miembro</span>
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
								{columnMeetings.map((meeting) => {
									const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;
									return (
										<TableHead
											key={meeting.id}
											className="text-center min-w-[90px] p-2 whitespace-normal"
										>
											<div className="flex items-center justify-center gap-1">
												<Link
													href={`/events/${meeting.id}/attendance`}
													className="hover:underline text-primary font-semibold text-xs hover:text-primary/80 transition-colors"
													title={meeting.name}
												>
													{formatMeetingHeader(
														meeting.date,
														meeting.time,
														isDuplicateDate,
													)}
												</Link>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="sm"
															className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
														>
															<MoreVertical className="h-3 w-3" />
															<span className="sr-only">Opciones</span>
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="center">
														<DropdownMenuItem asChild>
															<Link href={`/events/${meeting.id}/attendance`}>
																<ClipboardList className="mr-2 h-4 w-4" />
																Ver Asistencia
															</Link>
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</TableHead>
									);
								})}
							</TableRow>
						</TableHeader>
						<TableBody className="[&>tr:nth-child(even)]:bg-muted/30">
							{paginatedRowMembers.map((member, idx) => {
								const { rate, present, expected } = calculateMemberAttendanceRate(member.id);
								const daysAgo = calculateMemberLastAttendance(member.id);
								const lastAttendance = formatDaysAgo(daysAgo);
								const memberFullName = `${member.firstName} ${member.lastName}`;

								return (
									<TableRow 
										key={member.id}
										className={cn(
											"transition-colors hover:bg-muted/50",
											idx % 2 === 1 && "bg-muted/20"
										)}
									>
										<TableCell className="sticky left-0 z-10 font-medium w-[200px] min-w-[200px] border-r-2 border-border/40 p-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] bg-card">
											<span className="truncate">{memberFullName}</span>
										</TableCell>
										<TableCell 
											className="text-center p-2 bg-muted/40 font-bold"
											title={`${present} de ${expected} reuniones asistidas`}
										>
											{expected > 0 ? (
												<span className={getRateColorClass(rate)}>{rate}%</span>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell className="text-center p-2 bg-muted/40">
											<Tooltip>
												<TooltipTrigger asChild>
													<span className={cn("text-xs font-medium cursor-help", lastAttendance.color)}>
														{lastAttendance.text}
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>{daysAgo >= 0 ? `Hace ${daysAgo} días` : "Sin asistencia registrada"}</p>
												</TooltipContent>
											</Tooltip>
										</TableCell>
										{columnMeetings.map((meeting) => {
											const isExpected = expectedAttendeesMap[meeting.id]?.has(
												member.id,
											);
											let cellContent;

											if (isExpected) {
												const record = allAttendanceRecords.find(
													(r) =>
														r.memberId === member.id && r.meetingId === meeting.id,
												);
												if (record?.attended) {
													cellContent = (
														<span title={getAttendanceTooltip(memberFullName, "present", meeting.date)}>
															<CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
														</span>
													);
												} else if (record && !record.attended) {
													cellContent = (
														<span title={getAttendanceTooltip(memberFullName, "absent", meeting.date)}>
															<XCircle className="h-4 w-4 text-red-600 mx-auto" />
														</span>
													);
												} else {
													cellContent = (
														<span title={getAttendanceTooltip(memberFullName, "pending", meeting.date)}>
															<HelpCircle className="h-4 w-4 text-muted-foreground mx-auto" />
														</span>
													);
												}
											} else {
												cellContent = (
													<span title={getAttendanceTooltip(memberFullName, "not-applicable", meeting.date)}>
														<MinusCircle className="h-4 w-4 text-gray-300 mx-auto" />
													</span>
												);
											}

											return (
												<TableCell
													key={`${member.id}-${meeting.id}`}
													className="text-center p-0"
												>
													<Link
														href={`/events/${meeting.id}/attendance`}
														className="flex justify-center items-center h-full w-full p-1.5 hover:bg-primary/10 transition-colors rounded"
													>
														{cellContent}
													</Link>
												</TableCell>
											);
										})}
									</TableRow>
								);
							})}
							{paginatedRowMembers.length === 0 &&
								totalMembers > 0 && (
									<TableRow>
										<TableCell
											colSpan={columnMeetings.length + 3}
											className="text-center text-muted-foreground py-8"
										>
											No hay miembros que coincidan con los filtros aplicados.
										</TableCell>
									</TableRow>
								)}
							{initialRowMembers.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={columnMeetings.length + 3}
										className="text-center text-muted-foreground py-8"
									>
										No hay miembros convocados para las instancias visibles de
										esta serie
										{filterStartDate && filterEndDate
											? ` en el rango de fechas seleccionado`
											: ""}
										.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
				{(filterStartDate || filterEndDate) && (
					<div className="px-4 py-2 text-sm text-muted-foreground flex items-center border-t border-border/30">
						<CalendarRange className="mr-2 h-4 w-4 text-primary/80" />
						{captionDateRangeText}
					</div>
				)}

				{/* Leyenda Visual */}
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
						<div className="flex items-center gap-1.5">
							<MinusCircle className="h-4 w-4 text-gray-300" />
							<span className="text-muted-foreground">No convocado</span>
						</div>
						<div className="border-l-2 border-border/60 pl-4 ml-2 flex items-center gap-3">
							<span className="font-semibold text-foreground">Tasa:</span>
							<span className="text-green-600 font-medium">≥80%</span>
							<span className="text-yellow-600 font-medium">≥60%</span>
							<span className="text-orange-500 font-medium">≥40%</span>
							<span className="text-red-600 font-medium">&lt;40%</span>
						</div>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}
