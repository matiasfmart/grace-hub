import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, LayoutGrid, ListFilter } from "lucide-react";
import Link from "next/link";
import {
	addOccasionalMeetingAction,
	defineMeetingSeriesAction,
	deleteMeetingSeriesAction,
	updateMeetingSeriesAction,
} from "@/app/actions/eventActions";
import AttendanceLineChart from "@/components/events/AttendanceFrequencySummaryTable";
import AddOccasionalMeetingDialog from "@/components/events/add-occasional-meeting-dialog";
import DateRangeFilter from "@/components/events/date-range-filter";
import EventsTableFilters from "@/components/events/events-table-filters"; // Import the new component
import ManageMeetingSeriesDialog from "@/components/events/manage-meeting-series-dialog";
import MeetingTypeAttendanceTable from "@/components/events/meeting-type-attendance-table";
import PageSpecificAddMeetingDialog from "@/components/events/page-specific-add-meeting-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
	AttendanceRecord,
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
	getAllMeetingSeries,
	getFilteredMeetingInstances,
	getResolvedAttendeesForMeeting,
	getAllMembersNonPaginated,
	getAllMinistryAreas,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
	] = await Promise.all([
		getAllMeetingSeries(),
		getAllMembersNonPaginated(),
		getAllGdis(),
		getAllMinistryAreas(),
		getAllAttendanceRecords(),
	]);

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
	let initialRowMembers: Member[] = [];
	const selectedSeriesObject = actualSelectedSeriesId
		? seriesPresentInFilter.find((s) => s.id === actualSelectedSeriesId)
		: undefined;

	if (selectedSeriesObject) {
		// Create a dummy meeting to resolve all potential attendees for the SERIES based on CURRENT roles.
		const dummyMeetingForSeries: Pick<Meeting, "seriesId" | "attendeeUids"> = {
			seriesId: selectedSeriesObject.id,
			attendeeUids: [], // Not used for dynamic resolution
		};
		initialRowMembers = await getResolvedAttendeesForMeeting(
			dummyMeetingForSeries,
		);
	}

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
	Leader: "Líder",
	Worker: "Obrero",
	GeneralAttendee: "Asistente General",
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
	Active: "Activo",
	Inactive: "Inactivo",
	New: "Nuevo",
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

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-6">
				<h1 className="font-headline text-4xl font-bold text-primary">
					Administración de Reuniones Generales
				</h1>
				<p className="text-muted-foreground mt-1">
					Defina series, programe instancias y vea el historial de asistencia
					para eventos generales de la iglesia.
				</p>
			</div>

			<div className="flex flex-col md:flex-row gap-6 lg:gap-8">
				<aside className="md:w-72 lg:w-80 flex-shrink-0 space-y-6">
					<PageSpecificAddMeetingDialog
						defineMeetingSeriesAction={defineMeetingSeriesAction}
						seriesTypeContext="general"
					/>
					<div className="p-4 border rounded-lg shadow-sm bg-card">
						<h2 className="text-lg font-semibold mb-3 flex items-center">
							<LayoutGrid className="mr-2 h-5 w-5 text-primary" />
							Series de Reuniones Generales
						</h2>
						{allSeries.length > 0 ? (
							<ScrollArea className="max-h-60 md:max-h-72 lg:max-h-80 pr-3">
								<div className="space-y-1">
									{allSeries.map((series) => (
										<Button
											key={series.id}
											variant={
												selectedSeriesId === series.id ? "default" : "ghost"
											}
											className={cn(
												"w-full justify-start text-left h-auto py-2 px-3 text-sm",
												selectedSeriesId === series.id &&
													"bg-primary text-primary-foreground hover:bg-primary/90",
											)}
											asChild
										>
											<Link href={createSeriesLink(series.id)}>
												{series.name}
											</Link>
										</Button>
									))}
								</div>
							</ScrollArea>
						) : (
							<p className="text-sm text-muted-foreground py-2">
								No hay series generales definidas.
							</p>
						)}
					</div>

					<div className="p-4 border rounded-lg shadow-sm bg-card">
						<h2 className="text-lg font-semibold mb-3 flex items-center">
							<ListFilter className="mr-2 h-5 w-5 text-primary" />
							Filtrar Instancias (Columnas)
						</h2>
						<DateRangeFilter
							initialStartDate={appliedStartDate}
							initialEndDate={appliedEndDate}
						/>
					</div>
				</aside>

				<main className="flex-1 min-w-0">
					{selectedSeriesObject ? (
						<>
							<div className="mb-6 p-4 border rounded-lg bg-card shadow-md">
								<div className="flex flex-col sm:flex-row justify-between items-start gap-4">
									<div className="flex-grow">
										<h2 className="text-2xl font-semibold text-primary">
											{selectedSeriesObject.name}
										</h2>
										{selectedSeriesObject.description && (
											<p className="text-sm text-muted-foreground mt-1 max-w-prose">
												{selectedSeriesObject.description}
											</p>
										)}
										<div className="text-xs text-muted-foreground mt-2">
											<span>
												Hora Pred.: {selectedSeriesObject.defaultTime} |{" "}
											</span>
											<span>
												Lugar Pred.: {selectedSeriesObject.defaultLocation} |{" "}
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
									<div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 mt-2 sm:mt-0">
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
						<div className="text-center py-10 flex flex-col items-center justify-center">
							<CalendarDays className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
							<h2 className="text-2xl font-semibold text-muted-foreground">
								{allSeries.length > 0
									? "Seleccione una Serie"
									: appliedStartDate && appliedEndDate
										? "No hay reuniones para el rango seleccionado"
										: "No hay Series de Reuniones Generales Definidas"}
							</h2>
							<p className="text-muted-foreground mt-3 max-w-md">
								{allSeries.length > 0
									? "Elija una serie de la lista de la izquierda para ver sus instancias y gestionar la asistencia."
									: appliedStartDate &&
											appliedEndDate &&
											appliedStartDate === appliedEndDate
										? `(${format(parseISO(appliedStartDate), "dd/MM/yy", { locale: es })})`
										: appliedStartDate && appliedEndDate
											? `(${format(parseISO(appliedStartDate), "dd/MM/yy", { locale: es })} - ${format(parseISO(appliedEndDate), "dd/MM/yy", { locale: es })})`
											: "Defina una nueva serie de reuniones generales o ajuste los filtros de fecha."}
							</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
