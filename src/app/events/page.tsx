import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	AlertTriangle,
	CalendarCheck,
	CalendarDays,
	LayoutGrid,
	ListFilter,
	Percent,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
	addOccasionalMeetingAction,
	defineMeetingSeriesAction,
	deleteMeetingSeriesAction,
	updateMeetingSeriesAction,
} from "@/app/actions/eventActions";
import AttendanceLineChart from "@/components/events/AttendanceFrequencySummaryTable";
import AddOccasionalMeetingDialog from "@/components/events/add-occasional-meeting-dialog";
import EventsTableFilters from "@/components/events/events-table-filters";
import EventsToolbar from "@/components/events/events-toolbar";
import ManageMeetingSeriesDialog from "@/components/events/manage-meeting-series-dialog";
import MeetingTypeAttendanceTable from "@/components/events/meeting-type-attendance-table";
import PageSpecificAddMeetingDialog from "@/components/events/page-specific-add-meeting-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type {
	AttendanceRecord,
	AudienceType,
	GDI,
	Meeting,
	MeetingSeries,
	Member,
	MemberRoleType,
	MinistryArea,
} from "@/lib/types";
import {
	MemberRoleEnum,
	NO_AREA_FILTER_VALUE,
	NO_GDI_FILTER_VALUE,
	NO_ROLE_FILTER_VALUE,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	getAllAttendanceRecords,
	getAllGdis,
	getAllMeetings,
	getAllMeetingSeries,
	getFilteredMeetingInstances,
	getAllMembersNonPaginated,
	getAllMinistryAreas,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Derives the expected member rows for the attendance table based on the series' audienceType.
 * Mirrors ADR-004 operative level logic using already-loaded GDI/Area data.
 * For `by_categories`, falls back to all active members (role_types data not available client-side).
 */
function getExpectedMembersForSeries(
	series: MeetingSeries | undefined,
	allMembers: Member[],
	allGdis: GDI[],
	allAreas: MinistryArea[],
): Member[] {
	const activeMembers = allMembers.filter((m) => m.status === "vigente");
	if (!series) return activeMembers;

	switch (series.audienceType as AudienceType) {
		case "all_active":
			return activeMembers;

		case "gdi": {
			if (!series.gdiId) return activeMembers;
			const gdi = allGdis.find((g) => g.id === series.gdiId);
			if (!gdi) return activeMembers;
			const memberIds = new Set([gdi.guideId, ...gdi.memberIds]);
			return activeMembers.filter((m) => memberIds.has(m.id));
		}

		case "area": {
			if (!series.areaId) return activeMembers;
			const area = allAreas.find((a) => a.id === series.areaId);
			if (!area) return activeMembers;
			const memberIds = new Set([area.leaderId, ...area.memberIds]);
			return activeMembers.filter((m) => memberIds.has(m.id));
		}

		case "mentors": {
			// Level 4: mentors of GDIs or areas
			const mentorIds = new Set<string>();
			allGdis.forEach((g) => { if (g.mentorId) mentorIds.add(g.mentorId); });
			allAreas.forEach((a) => { if (a.mentorId) mentorIds.add(a.mentorId); });
			return activeMembers.filter((m) => mentorIds.has(m.id));
		}

		case "leaders": {
			// Level >= 3: guides of GDIs, leaders of areas, mentors
			const qualifiedIds = new Set<string>();
			allGdis.forEach((g) => {
				qualifiedIds.add(g.guideId);
				if (g.mentorId) qualifiedIds.add(g.mentorId);
			});
			allAreas.forEach((a) => {
				qualifiedIds.add(a.leaderId);
				if (a.mentorId) qualifiedIds.add(a.mentorId);
			});
			return activeMembers.filter((m) => qualifiedIds.has(m.id));
		}

		case "workers": {
			// Level >= 2: area members + leaders + mentors
			const qualifiedIds = new Set<string>();
			allGdis.forEach((g) => {
				qualifiedIds.add(g.guideId);
				if (g.mentorId) qualifiedIds.add(g.mentorId);
			});
			allAreas.forEach((a) => {
				qualifiedIds.add(a.leaderId);
				if (a.mentorId) qualifiedIds.add(a.mentorId);
				a.memberIds.forEach((id) => qualifiedIds.add(id));
			});
			return activeMembers.filter((m) => qualifiedIds.has(m.id));
		}

		case "integrated": {
			// Level >= 1: GDI members + area members + leaders + mentors
			const qualifiedIds = new Set<string>();
			allGdis.forEach((g) => {
				qualifiedIds.add(g.guideId);
				if (g.mentorId) qualifiedIds.add(g.mentorId);
				g.memberIds.forEach((id) => qualifiedIds.add(id));
			});
			allAreas.forEach((a) => {
				qualifiedIds.add(a.leaderId);
				if (a.mentorId) qualifiedIds.add(a.mentorId);
				a.memberIds.forEach((id) => qualifiedIds.add(id));
			});
			return activeMembers.filter((m) => qualifiedIds.has(m.id));
		}

		case "by_categories": {
			const roleTypeIds = series.audienceConfig?.roleTypeIds;
			if (!roleTypeIds || roleTypeIds.length === 0) return activeMembers;
			return activeMembers.filter((m) =>
				m.ecclesiasticalRoles?.some((er) =>
					roleTypeIds.includes(er.roleTypeId),
				),
			);
		}

		default:
			return activeMembers;
	}
}

interface EventsPageData {
	allSeries: MeetingSeries[];
	meetingsForPage: Meeting[];
	totalMeetingInstances: number;
	meetingInstancesTotalPages: number;
	meetingInstancesCurrentPage: number;
	allMembers: Member[];
	allGdis: GDI[];
	allMinistryAreas: MinistryArea[];
	allAttendanceRecords: AttendanceRecord[];
	initialRowMembers: Member[];
	expectedAttendeesMap: Record<string, Set<string>>;
	meetingsCountBySeries: Record<string, number>;
	memberCurrentPage: number;
	memberPageSize: number;
	appliedStartDate?: string;
	appliedEndDate?: string;
	selectedSeriesId?: string;
	// Filters for table members
	tableMemberRoleFilters: string[];
	tableMemberStatusFilters: Member["status"][];
	tableMemberGdiFilters: string[];
	tableMemberAreaFilters: string[];
}

interface EventsPageProps {
	searchParams?: Promise<{
		series?: string;
		startDate?: string;
		endDate?: string;
		page?: string;
		pageSize?: string;
		mPage?: string;
		mPSize?: string;
		// New search params for table filters
		tmr?: string; // table member roles
		tms?: string; // table member status
		tmg?: string; // table member gdi
		tma?: string; // table member area
	}>;
}

async function getEventsPageData(
	selectedSeriesIdParam?: string,
	startDateParam?: string,
	endDateParam?: string,
	meetingPageParam?: string,
	meetingPageSizeParam?: string,
	memberPageParam?: string,
	memberPageSizeParam?: string,
	tableMemberRolesParam?: string,
	tableMemberStatusParam?: string,
	tableMemberGdiParam?: string,
	tableMemberAreaParam?: string,
): Promise<EventsPageData> {
	const meetingCurrentPage = Number(meetingPageParam) || 1;
	let meetingPageSize = Number(meetingPageSizeParam) || 10;
	if (Number.isNaN(meetingPageSize) || meetingPageSize < 1)
		meetingPageSize = 10;

	const memberCurrentPage = Number(memberPageParam) || 1;
	let memberPageSize = Number(memberPageSizeParam) || 10;
	if (Number.isNaN(memberPageSize) || memberPageSize < 1) memberPageSize = 10;

	const [
		allSeriesData,
		allMembersData,
		allGdisData,
		allMinistryAreasData,
		allAttendanceRecordsData,
		allMeetingsData,
	] = await Promise.all([
		getAllMeetingSeries(),
		getAllMembersNonPaginated(),
		getAllGdis(),
		getAllMinistryAreas(),
		getAllAttendanceRecords(),
		getAllMeetings(),
	]);

	// Calculate meetings count by series
	const meetingsCountBySeries: Record<string, number> = {};
	for (const meeting of allMeetingsData) {
		if (meeting.seriesId) {
			meetingsCountBySeries[meeting.seriesId] = (meetingsCountBySeries[meeting.seriesId] || 0) + 1;
		}
	}

	const generalSeriesOnly = allSeriesData.filter(
		(s) => s.seriesType === "general",
	);
	const seriesPresentInFilter = generalSeriesOnly.sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	const actualSelectedSeriesId =
		selectedSeriesIdParam &&
		seriesPresentInFilter.some((s) => s.id === selectedSeriesIdParam)
			? selectedSeriesIdParam
			: seriesPresentInFilter.length > 0
				? seriesPresentInFilter[0].id
				: undefined;

	let meetingsForPage: Meeting[] = [];
	let totalMeetingInstances = 0;
	let meetingInstancesTotalPages = 1;

	if (actualSelectedSeriesId) {
		const result = await getFilteredMeetingInstances(
			[actualSelectedSeriesId],
			startDateParam,
			endDateParam,
			meetingCurrentPage,
			meetingPageSize,
		);
		meetingsForPage = result.instances;
		totalMeetingInstances = result.totalCount;
		meetingInstancesTotalPages = result.totalPages;
	}

	// ---MODIFIED LOGIC FOR ROWS---
	// Derive expected members based on the selected series' audienceType (ADR-004)
	const selectedSeries = actualSelectedSeriesId
		? seriesPresentInFilter.find((s) => s.id === actualSelectedSeriesId)
		: undefined;
	const initialRowMembers: Member[] = getExpectedMembersForSeries(
		selectedSeries,
		allMembersData,
		allGdisData,
		allMinistryAreasData,
	);

	const expectedAttendeesMap: Record<string, Set<string>> = {};
	for (const meeting of meetingsForPage) {
		// Use the historical snapshot of attendees stored in the meeting instance
		expectedAttendeesMap[meeting.id] = new Set(meeting.attendeeUids || []);
	}
	// ---END MODIFIED LOGIC---

	return {
		allSeries: seriesPresentInFilter,
		meetingsForPage,
		totalMeetingInstances,
		meetingInstancesTotalPages,
		meetingInstancesCurrentPage: meetingCurrentPage,
		allMembers: allMembersData,
		allGdis: allGdisData,
		allMinistryAreas: allMinistryAreasData,
		allAttendanceRecords: allAttendanceRecordsData,
		initialRowMembers,
		expectedAttendeesMap,
		meetingsCountBySeries,
		memberCurrentPage,
		memberPageSize,
		appliedStartDate: startDateParam,
		appliedEndDate: endDateParam,
		selectedSeriesId: actualSelectedSeriesId,
		tableMemberRoleFilters: tableMemberRolesParam
			? tableMemberRolesParam.split(",")
			: [],
		tableMemberStatusFilters: tableMemberStatusParam
			? (tableMemberStatusParam.split(",") as Member["status"][])
			: [],
		tableMemberGdiFilters: tableMemberGdiParam
			? tableMemberGdiParam.split(",")
			: [],
		tableMemberAreaFilters: tableMemberAreaParam
			? tableMemberAreaParam.split(",")
			: [],
	};
}

const roleDisplayMap: Record<MemberRoleType, string> = {
	GdiGuide: "Guía GDI",
	GdiMentor: "Mentor GDI",
	AreaLeader: "Líder Área",
	AreaMentor: "Mentor Área",
	Worker: "Obrero",
};
const roleFilterOptions: {
	value: MemberRoleType | typeof NO_ROLE_FILTER_VALUE;
	label: string;
}[] = [
	...(Object.keys(MemberRoleEnum.Values) as MemberRoleType[]).map((role) => ({
		value: role,
		label: roleDisplayMap[role] || role,
	})),
	{ value: NO_ROLE_FILTER_VALUE, label: "Sin Rol Asignado" },
];

const statusDisplayMap: Record<Member["status"], string> = {
	vigente: "Vigente",
	eliminado: "Eliminado",
};
const statusFilterOptions: { value: Member["status"]; label: string }[] =
	Object.entries(statusDisplayMap).map(([value, label]) => ({
		value: value as Member["status"],
		label,
	}));

export default async function EventsPage({ searchParams }: EventsPageProps) {
	const params = await searchParams;
	const {
		allSeries,
		meetingsForPage,
		totalMeetingInstances,
		meetingInstancesTotalPages,
		meetingInstancesCurrentPage,
		allMembers,
		allGdis,
		allMinistryAreas,
		allAttendanceRecords,
		initialRowMembers,
		expectedAttendeesMap,
		meetingsCountBySeries,
		memberCurrentPage,
		memberPageSize,
		appliedStartDate,
		appliedEndDate,
		selectedSeriesId,
		tableMemberRoleFilters,
		tableMemberStatusFilters,
		tableMemberGdiFilters,
		tableMemberAreaFilters,
	} = await getEventsPageData(
		params?.series,
		params?.startDate,
		params?.endDate,
		params?.page,
		params?.pageSize,
		params?.mPage,
		params?.mPSize,
		params?.tmr,
		params?.tms,
		params?.tmg,
		params?.tma,
	);

	const selectedSeriesObject = selectedSeriesId
		? allSeries.find((s) => s.id === selectedSeriesId)
		: undefined;

	const createPageURL = (newPageNumber: number) => {
		const urlParams = new URLSearchParams(params as any);
		if (newPageNumber > 1) {
			urlParams.set("page", newPageNumber.toString());
		} else {
			urlParams.delete("page");
		}
		return `/events?${urlParams.toString()}`;
	};

	const createSeriesLink = (seriesIdToLink: string) => {
		const urlParams = new URLSearchParams(params as any);
		urlParams.set("series", seriesIdToLink);
		if (appliedStartDate) urlParams.set("startDate", appliedStartDate);
		if (appliedEndDate) urlParams.set("endDate", appliedEndDate);
		if (params?.pageSize) urlParams.set("pageSize", params.pageSize);
		if (params?.mPSize) urlParams.set("mPSize", params.mPSize);
		// Preserve table member filters
		if (params?.tmr) urlParams.set("tmr", params.tmr);
		if (params?.tms) urlParams.set("tms", params.tms);
		if (params?.tmg) urlParams.set("tmg", params.tmg);
		if (params?.tma) urlParams.set("tma", params.tma);
		return `/events?${urlParams.toString()}`;
	};

	const gdiFilterOptions = [
		{ value: NO_GDI_FILTER_VALUE, label: "Miembros Sin GDI Asignado" },
		...allGdis.map((gdi) => ({
			value: gdi.id,
			label: `${gdi.name} (Guía: ${allMembers.find((m) => m.id === gdi.guideId)?.firstName || ""} ${allMembers.find((m) => m.id === gdi.guideId)?.lastName || "N/A"})`,
		})),
	];

	const areaFilterOptions = [
		{ value: NO_AREA_FILTER_VALUE, label: "Miembros Sin Área Asignada" },
		...allMinistryAreas.map((area) => ({
			value: area.id,
			label: `${area.name} (Líder: ${allMembers.find((m) => m.id === area.leaderId)?.firstName || ""} ${allMembers.find((m) => m.id === area.leaderId)?.lastName || "N/A"})`,
		})),
	];

	// Calculate KPI stats
	const totalSeries = allSeries.length;
	const totalInstances = totalMeetingInstances;
	
	// Calculate average attendance percentage and trend
	let avgAttendancePercent = 0;
	let attendanceTrend: "up" | "down" | "stable" = "stable";
	let trendDelta = 0;
	
	if (meetingsForPage.length > 0) {
		// Sort meetings by date for trend calculation
		const sortedMeetings = [...meetingsForPage].sort(
			(a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
		);
		
		const attendanceByMeeting = sortedMeetings.map((meeting) => {
			const expectedSet = expectedAttendeesMap[meeting.id] || new Set();
			const expectedCount = expectedSet.size;
			if (expectedCount === 0) return null;
			const presentCount = allAttendanceRecords.filter(
				(ar) => ar.meetingId === meeting.id && ar.attended && expectedSet.has(ar.memberId)
			).length;
			return (presentCount / expectedCount) * 100;
		}).filter((p): p is number => p !== null);
		
		if (attendanceByMeeting.length > 0) {
			avgAttendancePercent = Math.round(
				attendanceByMeeting.reduce((a, b) => a + b, 0) / attendanceByMeeting.length
			);
			
			// Calculate trend if we have at least 2 meetings
			if (attendanceByMeeting.length >= 2) {
				const midpoint = Math.floor(attendanceByMeeting.length / 2);
				const olderHalf = attendanceByMeeting.slice(0, midpoint);
				const recentHalf = attendanceByMeeting.slice(midpoint);
				
				const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
				const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
				
				trendDelta = Math.round(recentAvg - olderAvg);
				if (trendDelta >= 5) {
					attendanceTrend = "up";
				} else if (trendDelta <= -5) {
					attendanceTrend = "down";
				}
			}
		}
	}
	
	// Count instances without attendance records
	const instancesWithoutRecords = meetingsForPage.filter((meeting) => {
		return !allAttendanceRecords.some((ar) => ar.meetingId === meeting.id);
	}).length;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Eventos"
				description="Seguimiento de reuniones y asistencia."
			/>

			{/* KPI Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="border-l-4 border-l-primary">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<LayoutGrid className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="text-2xl font-bold">{totalSeries}</p>
								<p className="text-xs text-muted-foreground">Series Activas</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
							<CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-2xl font-bold">{totalInstances}</p>
								<p className="text-xs text-muted-foreground">Instancias</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className={cn("border-l-4", avgAttendancePercent >= 70 ? "border-l-green-500" : avgAttendancePercent >= 50 ? "border-l-yellow-500" : "border-l-red-500")}>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
						<div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", avgAttendancePercent >= 70 ? "bg-green-100 dark:bg-green-900/30" : avgAttendancePercent >= 50 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-red-100 dark:bg-red-900/30")}>
							<Percent className={cn("h-5 w-5", avgAttendancePercent >= 70 ? "text-green-600 dark:text-green-400" : avgAttendancePercent >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400")} />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<p className="text-2xl font-bold">{avgAttendancePercent}%</p>
									{attendanceTrend === "up" && (
										<span className="flex items-center text-green-600 text-xs font-medium">
											<TrendingUp className="h-3.5 w-3.5 mr-0.5" />
											+{trendDelta}%
										</span>
									)}
									{attendanceTrend === "down" && (
										<span className="flex items-center text-red-600 text-xs font-medium">
											<TrendingDown className="h-3.5 w-3.5 mr-0.5" />
											{trendDelta}%
										</span>
									)}
								</div>
								<p className="text-xs text-muted-foreground">Asist. Promedio</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className={cn("border-l-4", instancesWithoutRecords > 0 ? "border-l-warning" : "border-l-green-500")}>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
						<div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", instancesWithoutRecords > 0 ? "bg-warning/20" : "bg-green-100 dark:bg-green-900/30")}>
							<AlertTriangle className={cn("h-5 w-5", instancesWithoutRecords > 0 ? "text-warning" : "text-green-600 dark:text-green-400")} />
							</div>
							<div>
								<p className="text-2xl font-bold">{instancesWithoutRecords}</p>
								<p className="text-xs text-muted-foreground">Sin Registrar</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Toolbar: Series Select + Date Filter + New Series */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
				<EventsToolbar
					allSeries={allSeries}
					selectedSeriesId={selectedSeriesId}
					appliedStartDate={appliedStartDate}
					appliedEndDate={appliedEndDate}
					meetingsCountBySeries={meetingsCountBySeries}
				/>
				<PageSpecificAddMeetingDialog
					defineMeetingSeriesAction={defineMeetingSeriesAction}
					seriesTypeContext="general"
				/>
			</div>

			{/* Main Content - Full Width */}
			{selectedSeriesObject ? (
				<>
					<div className="mb-6 p-4 border rounded-lg bg-card shadow-sm">
						<div className="flex flex-col sm:flex-row justify-between items-start gap-4">
							<div className="flex-grow">
								<h2 className="text-lg font-semibold text-primary">
									{selectedSeriesObject.name}
								</h2>
								{selectedSeriesObject.description && (
									<p className="text-sm text-muted-foreground mt-1 max-w-prose">
										{selectedSeriesObject.description}
									</p>
								)}
								<div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
									<span>
										Hora Pred.: {selectedSeriesObject.defaultTime}
									</span>
									<span>
										Lugar Pred.: {selectedSeriesObject.defaultLocation}
									</span>
									<span>
										Frecuencia:{" "}
										{selectedSeriesObject.frequency === "OneTime"
											? "Única Vez"
											: selectedSeriesObject.frequency === "Weekly"
												? "Semanal"
												: "Mensual"}
									</span>
								</div>
							</div>
							<div className="flex flex-row gap-2 flex-shrink-0">
								<AddOccasionalMeetingDialog
									series={selectedSeriesObject}
									addOccasionalMeetingAction={addOccasionalMeetingAction}
								/>
								<ManageMeetingSeriesDialog
									series={selectedSeriesObject}
									updateMeetingSeriesAction={updateMeetingSeriesAction}
									deleteMeetingSeriesAction={deleteMeetingSeriesAction}
									seriesTypeContext="general"
								/>
							</div>
						</div>
					</div>

					{meetingsForPage.length > 0 && (
						<AttendanceLineChart
							meetingsForSeries={meetingsForPage}
							allAttendanceRecords={allAttendanceRecords}
							seriesName={selectedSeriesObject.name}
							filterStartDate={appliedStartDate}
							filterEndDate={appliedEndDate}
							expectedAttendeesMap={expectedAttendeesMap}
						/>
					)}

					{totalMeetingInstances > 0 ? (
						<>
							<h3 className="text-md font-semibold mb-2 flex items-center">
								<ListFilter className="mr-2 h-4 w-4 text-primary" />
								Filtrar Miembros en Tabla (Filas):
							</h3>
							<EventsTableFilters
								roleFilterOptions={roleFilterOptions}
								statusFilterOptions={statusFilterOptions}
								gdiFilterOptions={gdiFilterOptions}
								areaFilterOptions={areaFilterOptions}
								currentRoleFilters={tableMemberRoleFilters}
								currentStatusFilters={tableMemberStatusFilters}
								currentGdiFilters={tableMemberGdiFilters}
								currentAreaFilters={tableMemberAreaFilters}
							/>

							<MeetingTypeAttendanceTable
								displayedInstances={meetingsForPage}
								allMeetingSeries={allSeries}
								initialRowMembers={initialRowMembers}
								expectedAttendeesMap={expectedAttendeesMap}
								allAttendanceRecords={allAttendanceRecords}
								seriesName={selectedSeriesObject.name}
								filterStartDate={appliedStartDate}
								filterEndDate={appliedEndDate}
								memberCurrentPage={memberCurrentPage}
								memberPageSize={memberPageSize}
								memberRoleFilters={tableMemberRoleFilters}
								memberStatusFilters={tableMemberStatusFilters}
								memberGdiFilters={tableMemberGdiFilters}
								memberAreaFilters={tableMemberAreaFilters}
								allMembers={allMembers}
								allGdis={allGdis}
								allAreas={allMinistryAreas}
							/>
						</>
					) : (
						<div className="text-center py-10">
							<CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<h2 className="text-xl font-semibold text-muted-foreground">
								{appliedStartDate && appliedEndDate
									? `No hay instancias para "${selectedSeriesObject.name}" en el rango seleccionado`
									: `No hay instancias programadas para "${selectedSeriesObject.name}"`}
							</h2>
							<p className="text-muted-foreground mt-2">
								{appliedStartDate && appliedEndDate
									? `(${format(parseISO(appliedStartDate), "dd/MM/yy", { locale: es })} - ${format(parseISO(appliedEndDate), "dd/MM/yy", { locale: es })})`
									: "Agregue una instancia para esta serie o ajuste los filtros de fecha."}
							</p>
						</div>
					)}
					{meetingInstancesTotalPages > 1 && (
						<div className="flex items-center justify-end space-x-2 py-4">
							<Button
								variant="outline"
								size="sm"
								asChild
								disabled={meetingInstancesCurrentPage <= 1}
							>
								<Link href={createPageURL(meetingInstancesCurrentPage - 1)}>
									Anterior (Instancias)
								</Link>
							</Button>
							<span className="text-sm text-muted-foreground">
								Página {meetingInstancesCurrentPage} de{" "}
								{meetingInstancesTotalPages} (Instancias)
							</span>
							<Button
								variant="outline"
								size="sm"
								asChild
								disabled={
									meetingInstancesCurrentPage >= meetingInstancesTotalPages
								}
							>
								<Link href={createPageURL(meetingInstancesCurrentPage + 1)}>
									Siguiente (Instancias)
								</Link>
							</Button>
						</div>
					)}
				</>
			) : (
				<div className="text-center py-16 flex flex-col items-center justify-center border rounded-lg bg-muted/30">
					<CalendarDays className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
					<h2 className="text-2xl font-semibold text-muted-foreground">
						{allSeries.length > 0
							? "Seleccione una Serie"
							: "No hay Series de Reuniones Definidas"}
					</h2>
					<p className="text-muted-foreground mt-3 max-w-md">
						{allSeries.length > 0
							? "Elija una serie del selector para ver sus instancias y gestionar la asistencia."
							: "Defina una nueva serie de reuniones usando el botón de arriba."}
					</p>
				</div>
			)}
		</div>
	);
}
