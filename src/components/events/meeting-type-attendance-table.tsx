"use client";

import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	CalendarRange,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	HelpCircle,
	MinusCircle,
	MoreVertical,
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

	if (!displayedInstances || displayedInstances.length === 0) {
		const dateRangeInfo =
			filterStartDate && filterEndDate
				? ` para el rango de ${format(parseISO(filterStartDate), "dd/MM/yy", { locale: es })} a ${format(parseISO(filterEndDate), "dd/MM/yy", { locale: es })}`
				: "";
		return (
			<p className="text-muted-foreground py-4 text-center">
				No hay instancias de reunión para la serie &quot;{seriesName}&quot;
				{dateRangeInfo}.
			</p>
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
		<div className="border rounded-lg shadow-md mt-4">
			{initialRowMembers.length > 0 && ( // Show pagination controls if there are members *before* filtering table rows
				<div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b gap-2">
					<div className="text-sm text-muted-foreground">
						Mostrando {paginatedRowMembers.length} de {totalMembers} miembros
						filtrados (de {initialRowMembers.length} convocados originalmente
						para estas instancias).
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm">Mostrar:</span>
						<Select
							value={memberPageSize.toString()}
							onValueChange={handleMemberPageSizeChange}
						>
							<SelectTrigger className="w-[70px] h-8 text-xs">
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
									className="h-8 w-8 p-0"
									onClick={() => handleMemberPageChange(memberCurrentPage - 1)}
									disabled={memberCurrentPage <= 1}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span className="text-xs text-muted-foreground">
									Pág. {memberCurrentPage} de {totalMemberPages} (Miembros)
								</span>
								<Button
									variant="outline"
									size="sm"
									className="h-8 w-8 p-0"
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
						<TableRow>
							<TableHead className="sticky left-0 bg-card z-10 w-[200px] min-w-[200px] border-r p-2">
								Miembro
							</TableHead>
							{columnMeetings.map((meeting) => {
								const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;
								return (
									<TableHead
										key={meeting.id}
										className="text-center min-w-[100px] p-2 whitespace-normal"
									>
										<div className="flex items-center justify-center gap-1">
											<Link
												href={`/events/${meeting.id}/attendance`}
												className="hover:underline text-primary font-medium"
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
					<TableBody>
						{paginatedRowMembers.map((member) => (
							<TableRow key={member.id}>
								<TableCell className="sticky left-0 bg-card z-10 font-medium w-[200px] min-w-[200px] border-r p-2">
									{member.firstName} {member.lastName}
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
												<span title="Asistió">
													<CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
												</span>
											);
										} else if (record && !record.attended) {
											cellContent = (
												<span title="No Asistió">
													<XCircle className="h-5 w-5 text-red-600 mx-auto" />
												</span>
											);
										} else {
											cellContent = (
												<span title="Pendiente">
													<HelpCircle className="h-5 w-5 text-muted-foreground mx-auto" />
												</span>
											);
										}
									} else {
										cellContent = (
											<span title="No Aplicable">
												<MinusCircle className="h-5 w-5 text-gray-300 mx-auto" />
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
												className="flex justify-center items-center h-full w-full p-2 hover:bg-muted/50"
											>
												{cellContent}
											</Link>
										</TableCell>
									);
								})}
							</TableRow>
						))}
						{paginatedRowMembers.length === 0 &&
							totalMembers > 0 && ( // Filtered list is empty but original had members
								<TableRow>
									<TableCell
										colSpan={columnMeetings.length + 1}
										className="text-center text-muted-foreground py-8"
									>
										No hay miembros que coincidan con los filtros aplicados.
									</TableCell>
								</TableRow>
							)}
						{initialRowMembers.length === 0 && ( // No members were expected for these instances initially
							<TableRow>
								<TableCell
									colSpan={columnMeetings.length + 1}
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
				<div className="mt-3 px-4 pb-2 text-left text-sm text-muted-foreground flex items-center">
					<CalendarRange className="mr-2 h-4 w-4 text-primary/80" />
					{captionDateRangeText}
				</div>
			)}
		</div>
	);
}
