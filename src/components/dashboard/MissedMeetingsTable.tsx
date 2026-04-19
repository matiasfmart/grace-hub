"use client";

import {
	endOfDay,
	format,
	isPast,
	isToday,
	isValid,
	parseISO,
	startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { Filter, UserCog, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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
	MemberRoleType,
} from "@/lib/types";
import { MemberRoleEnum, NO_ROLE_FILTER_VALUE } from "@/lib/types";

interface MissedMeetingsTableProps {
	generalMeetingsSorted: Meeting[];
	allMembers: Member[];
	allAttendanceRecords: AttendanceRecord[];
	allMeetingSeries: MeetingSeries[];
	allGdis: GDI[];
}

interface AbsentMemberInfo {
	member: Member;
	missedMeetingName: string;
	missedMeetingDate: string;
	guideName?: string;
}

const roleDisplayMap: Record<MemberRoleType, string> = {
	GdiGuide: "Guía GDI",
	GdiMentor: "Mentor GDI",
	AreaLeader: "Líder Área",
	AreaMentor: "Mentor Área",
	Worker: "Obrero",
};

const statusDisplayMap: Record<Member["status"], string> = {
	vigente: "Vigente",
	eliminado: "Eliminado",
};

const availableRoleFilters: {
	value: MemberRoleType | typeof NO_ROLE_FILTER_VALUE;
	label: string;
}[] = [
	...(Object.keys(MemberRoleEnum.Values) as MemberRoleType[]).map((role) => ({
		value: role,
		label: roleDisplayMap[role] || role,
	})),
	{ value: NO_ROLE_FILTER_VALUE, label: "Sin Rol Asignado" },
];

const availableStatusFilters: { value: Member["status"]; label: string }[] = [
	{ value: "vigente", label: "Vigente" },
	{ value: "eliminado", label: "Eliminado" },
];

export default function MissedMeetingsTable({
	generalMeetingsSorted = [],
	allMembers = [],
	allAttendanceRecords = [],
	allMeetingSeries = [],
	allGdis = [],
}: MissedMeetingsTableProps) {
	const [startDate, setStartDate] = useState<Date | undefined>(undefined);
	const [endDate, setEndDate] = useState<Date | undefined>(undefined);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
	const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

	const absentMembersData = useMemo(() => {
		let meetingsToConsider: Meeting[];

		if (!startDate && !endDate) {
			// Default behavior: find the single most recent meeting that has occurred.
			const _today = new Date();
			const mostRecentPastOrPresentMeeting = generalMeetingsSorted.find(
				(meeting) => {
					const meetingDateObj = parseISO(meeting.date);
					return (
						isValid(meetingDateObj) &&
						(isPast(meetingDateObj) || isToday(meetingDateObj))
					);
				},
			);
			meetingsToConsider = mostRecentPastOrPresentMeeting
				? [mostRecentPastOrPresentMeeting]
				: [];
		} else {
			// User has applied date filters, use the specified range.
			meetingsToConsider = generalMeetingsSorted.filter((meeting) => {
				const meetingDateObj = parseISO(meeting.date);
				if (!isValid(meetingDateObj)) return false;

				const isAfterStart = startDate
					? meetingDateObj >= startOfDay(startDate)
					: true;
				const isBeforeEnd = endDate
					? meetingDateObj <= endOfDay(endDate)
					: true;

				return isAfterStart && isBeforeEnd;
			});
		}

		const data: AbsentMemberInfo[] = [];
		if (meetingsToConsider.length === 0) return data;

		meetingsToConsider.forEach((meeting) => {
			let expectedAttendeeIds: string[] = meeting.attendeeUids || [];
			const parentSeries = allMeetingSeries.find(
				(s) => s.id === meeting.seriesId,
			);
			if (
				parentSeries?.seriesType === "general" &&
				(parentSeries.targetAttendeeGroups || []).includes("allMembers")
			) {
				expectedAttendeeIds = allMembers.map((m) => m.id);
			}

			const attendedMemberIdsInThisMeeting = new Set(
				allAttendanceRecords
					.filter((r) => r.meetingId === meeting.id && r.attended)
					.map((r) => r.memberId),
			);

			expectedAttendeeIds.forEach((memberId) => {
				const member = allMembers.find((m) => m.id === memberId);
				if (member) {
					// Apply status filter
					if (
						selectedStatuses.length > 0 &&
						!selectedStatuses.includes(member.status)
					) {
						return;
					}
					// Apply role filter
					const memberRoles = member.roles || [];
					const hasNoRoleFilter = selectedRoles.includes(NO_ROLE_FILTER_VALUE);
					const actualRoleFilters = selectedRoles.filter(
						(r) => r !== NO_ROLE_FILTER_VALUE,
					);

					let roleMatch = true;
					if (selectedRoles.length > 0) {
						const memberHasActualRole =
							actualRoleFilters.length > 0 &&
							memberRoles.some((role) => actualRoleFilters.includes(role));
						const memberHasNoAssignedRole = memberRoles.length === 0;

						if (hasNoRoleFilter && actualRoleFilters.length > 0) {
							roleMatch = memberHasActualRole || memberHasNoAssignedRole;
						} else if (hasNoRoleFilter) {
							roleMatch = memberHasNoAssignedRole;
						} else if (actualRoleFilters.length > 0) {
							roleMatch = memberHasActualRole;
						} else {
							roleMatch = true; // No role filter selected effectively
						}
					}
					if (!roleMatch) return;

					if (!attendedMemberIdsInThisMeeting.has(member.id)) {
						let guideName = "N/A";
						if (
							member.assignedGDIId &&
							Array.isArray(allGdis) &&
							allGdis.length > 0
						) {
							const gdi = allGdis.find((g) => g.id === member.assignedGDIId);
							if (gdi) {
								const guide = allMembers.find((m) => m.id === gdi.guideId);
								guideName = guide
									? `${guide.firstName} ${guide.lastName}`
									: "Guía no encontrado";
							} else {
								guideName = "GDI no encontrado";
							}
						}

						if (
							!data.some(
								(entry) =>
									entry.member.id === member.id &&
									entry.missedMeetingName === meeting.name,
							)
						) {
							data.push({
								member,
								missedMeetingName: meeting.name,
								missedMeetingDate: format(
									parseISO(meeting.date),
									"dd MMM yyyy",
									{ locale: es },
								),
								guideName,
							});
						}
					}
				}
			});
		});
		return data.sort((a, b) => {
			const nameA = `${a.member.firstName} ${a.member.lastName}`;
			const nameB = `${b.member.firstName} ${b.member.lastName}`;
			if (nameA !== nameB) return nameA.localeCompare(nameB);
			// Ensure date strings are valid before attempting to parse for sorting
			const dateAIsValid = isValid(parseISO(a.missedMeetingDate));
			const dateBIsValid = isValid(parseISO(b.missedMeetingDate));

			if (dateAIsValid && dateBIsValid) {
				return (
					parseISO(b.missedMeetingDate).getTime() -
					parseISO(a.missedMeetingDate).getTime()
				);
			} else if (dateAIsValid) {
				return -1; // Valid dates first
			} else if (dateBIsValid) {
				return 1; // Valid dates first
			}
			return 0; // Both invalid or equal
		});
	}, [
		generalMeetingsSorted,
		allMembers,
		allAttendanceRecords,
		allMeetingSeries,
		allGdis,
		startDate,
		endDate,
		selectedStatuses,
		selectedRoles,
	]);

	const toggleFilterItem = (
		itemValue: string,
		currentSelectedArray: string[],
		setter: React.Dispatch<React.SetStateAction<string[]>>,
	) => {
		const newArray = currentSelectedArray.includes(itemValue)
			? currentSelectedArray.filter((i) => i !== itemValue)
			: [...currentSelectedArray, itemValue];
		setter(newArray);
	};

	const hasActiveFilters =
		startDate ||
		endDate ||
		selectedStatuses.length > 0 ||
		selectedRoles.length > 0;

	const clearAllFilters = () => {
		setStartDate(undefined);
		setEndDate(undefined);
		setSelectedStatuses([]);
		setSelectedRoles([]);
	};

	return (
		<div className="space-y-4">
			<div className="p-4 border rounded-lg bg-card shadow-sm">
				<h3 className="text-md font-semibold text-primary flex items-center mb-3">
					<Filter className="mr-2 h-4 w-4" /> Filtrar Ausencias en Reuniones
					Generales
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label
							htmlFor="startDateFilterAbsent"
							className="block mb-1 text-xs font-medium text-muted-foreground"
						>
							Fecha Inicio (Reunión)
						</label>
						<DatePicker
							date={startDate}
							setDate={setStartDate}
							placeholder="Desde"
						/>
					</div>
					<div>
						<label
							htmlFor="endDateFilterAbsent"
							className="block mb-1 text-xs font-medium text-muted-foreground"
						>
							Fecha Fin (Reunión)
						</label>
						<DatePicker
							date={endDate}
							setDate={setEndDate}
							placeholder="Hasta"
						/>
					</div>
					<div>
						<label className="block mb-1 text-xs font-medium text-muted-foreground">
							Estado del Miembro
						</label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="w-full justify-start">
									<Users className="mr-2 h-4 w-4" />
									{selectedStatuses.length > 0
										? `Estado (${selectedStatuses.length})`
										: "Estado del Miembro"}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{availableStatusFilters.map((opt) => (
									<DropdownMenuCheckboxItem
										key={opt.value}
										checked={selectedStatuses.includes(opt.value)}
										onCheckedChange={() =>
											toggleFilterItem(
												opt.value,
												selectedStatuses,
												setSelectedStatuses,
											)
										}
									>
										{opt.label}
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div>
						<label className="block mb-1 text-xs font-medium text-muted-foreground">
							Rol del Miembro
						</label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="w-full justify-start">
									<UserCog className="mr-2 h-4 w-4" />
									{selectedRoles.length > 0
										? `Rol (${selectedRoles.length})`
										: "Rol del Miembro"}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuLabel>Filtrar por Rol</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{availableRoleFilters.map((opt) => (
									<DropdownMenuCheckboxItem
										key={opt.value}
										checked={selectedRoles.includes(opt.value)}
										onCheckedChange={() =>
											toggleFilterItem(
												opt.value,
												selectedRoles,
												setSelectedRoles,
											)
										}
									>
										{opt.label}
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
				{hasActiveFilters && (
					<Button
						onClick={clearAllFilters}
						variant="link"
						size="sm"
						className="mt-2 px-0 text-xs text-destructive hover:text-destructive/80"
					>
						<X className="mr-1 h-3 w-3" /> Limpiar todos los filtros de
						ausencias
					</Button>
				)}
			</div>

			{generalMeetingsSorted.length === 0 && (
				<p className="text-muted-foreground text-center py-4">
					No hay reuniones generales registradas.
				</p>
			)}
			{generalMeetingsSorted.length > 0 && absentMembersData.length === 0 && (
				<p className="text-muted-foreground text-center py-4">
					{hasActiveFilters
						? "No hay miembros ausentes que coincidan con los filtros."
						: "¡Excelente! Todos los miembros esperados asistieron a la última reunión."}
				</p>
			)}

			{absentMembersData.length > 0 && (
				<ScrollArea className="h-[300px] border rounded-md">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Miembro</TableHead>
								<TableHead>Reunión Ausente</TableHead>
								<TableHead>Fecha Reunión</TableHead>
								<TableHead>Guía GDI</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead>Estado Miembro</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{absentMembersData.map(
								(
									{ member, missedMeetingName, missedMeetingDate, guideName },
									index,
								) => (
									<TableRow key={`${member.id}-${missedMeetingName}-${index}`}>
										<TableCell>
											<div className="flex items-center space-x-2">
												<Avatar className="h-8 w-8">
													<AvatarFallback>
														{member.firstName.charAt(0)}
														{member.lastName.charAt(0)}
													</AvatarFallback>
												</Avatar>
												<span>
													{member.firstName} {member.lastName}
												</span>
											</div>
										</TableCell>
										<TableCell>{missedMeetingName}</TableCell>
										<TableCell>{missedMeetingDate}</TableCell>
										<TableCell>{guideName || "N/A"}</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{member.roles && member.roles.length > 0 ? (
													member.roles.map((role) => (
														<Badge
															key={role}
															variant="outline"
															className="text-xs"
														>
															{roleDisplayMap[role] || role}
														</Badge>
													))
												) : (
													<Badge variant="secondary" className="text-xs">
														Ninguno
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													member.status === "vigente"
														? "default"
														: "destructive"
												}
											>
												{statusDisplayMap[member.status] || member.status}
											</Badge>
										</TableCell>
									</TableRow>
								),
							)}
						</TableBody>
					</Table>
				</ScrollArea>
			)}
			<p className="text-xs text-muted-foreground mt-2">
				Mostrando {absentMembersData.length} miembro(s) ausente(s) según los
				filtros aplicados.
				{!startDate &&
					!endDate &&
					generalMeetingsSorted.length > 0 &&
					` Se considera la última reunión general que ha ocurrido.`}
			</p>
		</div>
	);
}
