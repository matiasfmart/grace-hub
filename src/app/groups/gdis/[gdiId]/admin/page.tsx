"use client";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarDays, Edit, Loader2 } from "lucide-react";
import Link from "next/link";
import {
	notFound,
	useParams as useNextParams,
	useSearchParams as useNextSearchParams,
	useRouter,
} from "next/navigation";
import { useEffect, useState } from "react";
import AttendanceLineChart from "@/components/events/AttendanceFrequencySummaryTable";
import AddOccasionalMeetingDialog from "@/components/events/add-occasional-meeting-dialog";
import DateRangeFilter from "@/components/events/date-range-filter";
import ManageMeetingSeriesDialog from "@/components/events/manage-meeting-series-dialog";
import MeetingTypeAttendanceTable from "@/components/events/meeting-type-attendance-table";
import PageSpecificAddMeetingDialog from "@/components/events/page-specific-add-meeting-dialog";
import ManageSingleGdiView from "@/components/groups/manage-single-gdi-view";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	AttendanceRecord,
	DefineMeetingSeriesFormValues,
	GDI,
	Meeting,
	MeetingSeries,
	Member,
} from "@/lib/types";
import {
	getAllAttendanceRecords,
	getAllGdis,
	getGdiById,
	getGroupMeetingInstances,
	getSeriesForGroup,
	getAllMembersNonPaginated,
} from "@/lib/api/services";
import {
	handleAddGdiMeetingSeriesAction,
	handleAddMeetingForCurrentGDIAction,
	handleDeleteGdiMeetingSeriesAction,
	handleUpdateGdiMeetingSeriesAction,
	updateGdiDetailsAction,
} from "./actions";

type GdiAdminPageProps = {};

interface GdiAdminPageData {
	gdi: GDI;
	allMembers: Member[];
	activeMembers: Member[];
	allGdis: GDI[];
	groupMeetingSeries: MeetingSeries[];
	meetingsForChart: Meeting[];
	meetingsForTable: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	initialRowMembersForTable: Member[];
	expectedAttendeesMapForTable: Record<string, Set<string>>;
	memberCurrentPageForTable: number;
	memberPageSizeForTable: number;
	appliedStartDate?: string;
	appliedEndDate?: string;
	activeSeriesId?: string;
}

async function getData(
	gdiId: string,
	searchParams: {
		activeSeriesId?: string;
		startDate?: string;
		endDate?: string;
		mPage?: string;
		mPSize?: string;
	},
): Promise<GdiAdminPageData> {
	const {
		activeSeriesId: spActiveSeriesId,
		startDate: spStartDate,
		endDate: spEndDate,
		mPage: spMPage,
		mPSize: spMPSize,
	} = searchParams;

	const gdiDetails = await getGdiById(gdiId);
	if (!gdiDetails) notFound();

	const [
		allMembersData,
		allGdisData,
		allAttendanceRecordsData,
		groupSeriesData,
	] = await Promise.all([
		getAllMembersNonPaginated(),
		getAllGdis(),
		getAllAttendanceRecords(),
		getSeriesForGroup("gdi", gdiId),
	]);

	const sortedGroupSeries = groupSeriesData.sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	const actualActiveSeriesId =
		spActiveSeriesId && sortedGroupSeries.some((s) => s.id === spActiveSeriesId)
			? spActiveSeriesId
			: spActiveSeriesId === "all"
				? "all"
				: sortedGroupSeries.length > 0
					? sortedGroupSeries[0].id
					: undefined;

	let meetingsForChartAndTable: Meeting[] = [];
	if (gdiDetails) {
		const result = await getGroupMeetingInstances(
			"gdi",
			gdiId,
			actualActiveSeriesId === "all" ? undefined : actualActiveSeriesId,
			spStartDate,
			spEndDate,
			1,
			Infinity,
		);
		meetingsForChartAndTable = result.instances;
	}

	const memberCurrentPage = Number(spMPage) || 1;
	let memberPageSize = Number(spMPSize) || 10;
	if (Number.isNaN(memberPageSize) || memberPageSize < 1) memberPageSize = 10;

	// ---MODIFIED LOGIC FOR ROWS---
	// The rows should be all current members of THIS GDI.
	const gdiMemberIds = new Set([gdiDetails.guideId, ...gdiDetails.memberIds]);
	const initialRowMembers = allMembersData
		.filter((member) => gdiMemberIds.has(member.id))
		.sort((a, b) =>
			`${a.firstName} ${a.lastName}`.localeCompare(
				`${b.firstName} ${b.lastName}`,
			),
		);

	const expectedAttendeesMap: Record<string, Set<string>> = {};
	for (const meeting of meetingsForChartAndTable) {
		// Use the historical snapshot of attendees stored in the meeting instance
		expectedAttendeesMap[meeting.id] = new Set(meeting.attendeeUids || []);
	}
	// ---END MODIFIED LOGIC---

	return {
		gdi: gdiDetails,
		allMembers: allMembersData,
		activeMembers: allMembersData.filter((m) => m.status === "Active"),
		allGdis: allGdisData,
		groupMeetingSeries: sortedGroupSeries,
		meetingsForChart: meetingsForChartAndTable,
		meetingsForTable: meetingsForChartAndTable,
		allAttendanceRecords: allAttendanceRecordsData,
		initialRowMembersForTable: initialRowMembers,
		expectedAttendeesMapForTable: expectedAttendeesMap,
		memberCurrentPageForTable: memberCurrentPage,
		memberPageSizeForTable: memberPageSize,
		appliedStartDate: spStartDate,
		appliedEndDate: spEndDate,
		activeSeriesId: actualActiveSeriesId,
	};
}

export default function GdiAdminPage({}: GdiAdminPageProps) {
	const router = useRouter();
	const paramsFromHook = useNextParams();
	const currentHookSearchParams = useNextSearchParams();

	const gdiId = paramsFromHook.gdiId as string;

	const spActiveSeriesId =
		currentHookSearchParams.get("activeSeriesId") || undefined;
	const spStartDate = currentHookSearchParams.get("startDate") || undefined;
	const spEndDate = currentHookSearchParams.get("endDate") || undefined;
	const spMPage = currentHookSearchParams.get("mPage") || undefined;
	const spMPSize = currentHookSearchParams.get("mPSize") || undefined;

	const [pageData, setPageData] = useState<GdiAdminPageData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isEditGdiDetailsOpen, setIsEditGdiDetailsOpen] = useState(false);

	useEffect(() => {
		if (!gdiId) return;
		setIsLoading(true);
		setError(null);

		getData(gdiId, {
			activeSeriesId: spActiveSeriesId,
			startDate: spStartDate,
			endDate: spEndDate,
			mPage: spMPage,
			mPSize: spMPSize,
		})
			.then((data) => {
				setPageData(data);
			})
			.catch((err) => {
				console.error("Failed to load GDI admin data:", err);
				if (err.message.includes("notFound")) {
					notFound();
				} else {
					setError(err.message || "Error al cargar datos del GDI.");
				}
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [gdiId, spActiveSeriesId, spStartDate, spEndDate, spMPage, spMPSize]);

	const handleSeriesDefined = (newSeriesId?: string) => {
		if (newSeriesId) {
			const params = new URLSearchParams(currentHookSearchParams.toString());
			params.set("activeSeriesId", newSeriesId);
			params.delete("mPage");
			router.push(`/groups/gdis/${gdiId}/admin?${params.toString()}`);
		} else {
			router.refresh();
		}
	};

	const handleSeriesDeleted = () => {
		const params = new URLSearchParams(currentHookSearchParams.toString());
		params.delete("activeSeriesId");
		params.delete("mPage");
		router.push(`/groups/gdis/${gdiId}/admin?${params.toString()}`);
	};

	const createSeriesLink = (seriesIdToLink: string) => {
		const params = new URLSearchParams(currentHookSearchParams.toString());
		params.set("activeSeriesId", seriesIdToLink);
		if (spStartDate) params.set("startDate", spStartDate);
		if (spEndDate) params.set("endDate", spEndDate);
		if (spMPSize) params.set("mPSize", spMPSize);
		return `/groups/gdis/${gdiId}/admin?${params.toString()}`;
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-200px)]">
				<Loader2 className="h-12 w-12 animate-spin text-primary" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto py-8 px-4 text-destructive text-center">
				{error}
			</div>
		);
	}

	if (!pageData) {
		return (
			<div className="container mx-auto py-8 px-4 text-center">
				No se pudieron cargar los datos del GDI.
			</div>
		);
	}

	const {
		gdi,
		allMembers,
		activeMembers,
		allGdis,
		groupMeetingSeries,
		meetingsForChart,
		meetingsForTable,
		allAttendanceRecords,
		initialRowMembersForTable,
		expectedAttendeesMapForTable,
		memberCurrentPageForTable,
		memberPageSizeForTable,
		appliedStartDate,
		appliedEndDate,
		activeSeriesId,
	} = pageData;

	const selectedSeriesObject =
		activeSeriesId && activeSeriesId !== "all"
			? groupMeetingSeries.find((s) => s.id === activeSeriesId)
			: undefined;

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-6 flex justify-start items-center">
				{" "}
				{/* Removed justify-between */}
				<Button asChild variant="outline">
					<Link href="/groups">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Grupos
					</Link>
				</Button>
				{/* Edit GDI Dialog trigger moved to CardHeader below */}
			</div>
			<Card className="mb-8 shadow-lg">
				<CardHeader className="flex flex-row justify-between items-start">
					<div>
						<CardTitle className="font-headline text-3xl text-primary">
							Administrar GDI: {gdi.name}
						</CardTitle>
						<CardDescription>
							Guía: {allMembers.find((m) => m.id === gdi.guideId)?.firstName}{" "}
							{allMembers.find((m) => m.id === gdi.guideId)?.lastName}
						</CardDescription>
					</div>
					<Dialog
						open={isEditGdiDetailsOpen}
						onOpenChange={setIsEditGdiDetailsOpen}
					>
						<DialogTrigger asChild>
							<Button variant="outline">
								<Edit className="mr-2 h-4 w-4" />
								Editar Detalles
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
							<DialogHeader className="p-6 pb-4 border-b">
								<DialogTitle>Editar Detalles: {gdi.name}</DialogTitle>
								<DialogDescription>
									Modifique los detalles del GDI. Los cambios se guardarán al
									hacer clic en &quot;Guardar Cambios&quot;.
								</DialogDescription>
							</DialogHeader>
							<div className="flex-grow overflow-y-auto p-1 sm:p-6">
								<ManageSingleGdiView
									gdi={gdi}
									allMembers={allMembers}
									activeMembers={activeMembers}
									allGdis={allGdis}
									updateGdiAction={async (gdiIdOrNewData, updatedData) => {
										if (typeof gdiIdOrNewData !== "string" || !updatedData) {
											throw new Error(
												"updateGdiAction: Firma inválida para edición de GDI",
											);
										}
										return updateGdiDetailsAction(gdiIdOrNewData, updatedData);
									}}
									onSuccess={async () => {
										setIsEditGdiDetailsOpen(false);
										// Refresca los datos locales tras editar
										if (!gdiId) return;
										setIsLoading(true);
										setError(null);
										try {
											const data = await getData(gdiId, {
												activeSeriesId: spActiveSeriesId,
												startDate: spStartDate,
												endDate: spEndDate,
												mPage: spMPage,
												mPSize: spMPSize,
											});
											setPageData(data);
										} catch (err) {
											setError(
												(err as any).message ||
													"Error al cargar datos del GDI.",
											);
										} finally {
											setIsLoading(false);
										}
									}}
								/>
							</div>
						</DialogContent>
					</Dialog>
				</CardHeader>
			</Card>

			<Card className="mt-8 shadow-lg">
				<CardHeader>
					<div className="flex justify-between items-start">
						<div>
							<CardTitle className="font-headline text-2xl text-primary flex items-center">
								<CalendarDays className="mr-2 h-5 w-5" /> Reuniones del GDI:{" "}
								{gdi.name}
							</CardTitle>
							<CardDescription>
								Defina series de reuniones recurrentes, programe instancias y
								gestione la asistencia para este GDI.
							</CardDescription>
						</div>
						<PageSpecificAddMeetingDialog
							defineMeetingSeriesAction={(
								data: DefineMeetingSeriesFormValues,
							) => handleAddGdiMeetingSeriesAction(gdi.id, data)}
							seriesTypeContext="gdi"
							ownerGroupIdContext={gdi.id}
							onSeriesDefined={handleSeriesDefined}
						/>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border-t pt-6">
						<div className="md:col-span-1 space-y-4">
							<div>
								<Label
									htmlFor="gdiSeriesFilter"
									className="text-sm font-medium"
								>
									Seleccionar Serie del GDI:
								</Label>
								<Select
									value={
										activeSeriesId ||
										(groupMeetingSeries.length > 0 ? "all" : "")
									}
									onValueChange={(value) =>
										router.push(createSeriesLink(value))
									}
									disabled={groupMeetingSeries.length === 0}
								>
									<SelectTrigger id="gdiSeriesFilter" className="mt-1">
										<SelectValue placeholder="Filtrar por serie..." />
									</SelectTrigger>
									<SelectContent>
										{groupMeetingSeries.length > 0 && (
											<SelectItem value="all">
												Todas las Series de este GDI
											</SelectItem>
										)}
										{groupMeetingSeries.map((series) => (
											<SelectItem key={series.id} value={series.id}>
												{series.name}
											</SelectItem>
										))}
										{groupMeetingSeries.length === 0 && (
											<SelectItem value="no-gdi-series-placeholder" disabled>
												No hay series para este GDI
											</SelectItem>
										)}
									</SelectContent>
								</Select>
							</div>
							<DateRangeFilter
								initialStartDate={appliedStartDate}
								initialEndDate={appliedEndDate}
							/>
						</div>

						<div className="md:col-span-2">
							{selectedSeriesObject ? (
								<div className="mb-6 p-4 border rounded-lg bg-card shadow-sm">
									<div className="flex flex-col sm:flex-row justify-between items-start gap-4">
										<div>
											<h3 className="text-xl font-semibold text-primary">
												{selectedSeriesObject.name}
											</h3>
											{selectedSeriesObject.description && (
												<p className="text-xs text-muted-foreground mt-1 max-w-prose">
													{selectedSeriesObject.description}
												</p>
											)}
											<div className="text-xs text-muted-foreground mt-1.5">
												<span>Hora: {selectedSeriesObject.defaultTime} | </span>
												<span>
													Lugar: {selectedSeriesObject.defaultLocation} |{" "}
												</span>
												<span>
													Frec:{" "}
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
												addOccasionalMeetingAction={(seriesId, formData) =>
													handleAddMeetingForCurrentGDIAction(
														gdi.id,
														seriesId,
														formData,
													)
												}
												onSuccess={() => router.refresh()}
											/>
											<ManageMeetingSeriesDialog
												series={selectedSeriesObject}
												updateMeetingSeriesAction={(seriesIdToUpdate, data) =>
													handleUpdateGdiMeetingSeriesAction(
														gdi.id,
														seriesIdToUpdate,
														data,
													)
												}
												deleteMeetingSeriesAction={(seriesIdToDelete) =>
													handleDeleteGdiMeetingSeriesAction(
														gdi.id,
														seriesIdToDelete,
													)
												}
												seriesTypeContext="gdi"
												ownerGroupIdContext={gdi.id}
												onDeleteSuccess={handleSeriesDeleted}
											/>
										</div>
									</div>
								</div>
							) : (
								activeSeriesId &&
								activeSeriesId !== "all" && (
									<p className="text-muted-foreground text-center py-4">
										La serie seleccionada no se encontró o no pertenece a este
										GDI.
									</p>
								)
							)}

							{meetingsForChart.length > 0 && (
								<AttendanceLineChart
									meetingsForSeries={meetingsForChart}
									allAttendanceRecords={allAttendanceRecords}
									seriesName={
										selectedSeriesObject?.name || "Todas las Series del GDI"
									}
									filterStartDate={appliedStartDate}
									filterEndDate={appliedEndDate}
									expectedAttendeesMap={expectedAttendeesMapForTable}
								/>
							)}

							{meetingsForTable.length > 0 ? (
								<MeetingTypeAttendanceTable
									displayedInstances={meetingsForTable}
									allMeetingSeries={groupMeetingSeries}
									initialRowMembers={initialRowMembersForTable}
									expectedAttendeesMap={expectedAttendeesMapForTable}
									allAttendanceRecords={allAttendanceRecords}
									seriesName={
										selectedSeriesObject?.name || "Todas las Series del GDI"
									}
									filterStartDate={appliedStartDate}
									filterEndDate={appliedEndDate}
									memberCurrentPage={memberCurrentPageForTable}
									memberPageSize={memberPageSizeForTable}
									allMembers={allMembers}
									allGdis={allGdis}
									allAreas={[]}
								/>
							) : (
								<div className="text-center py-10">
									<CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h2 className="text-xl font-semibold text-muted-foreground">
										{groupMeetingSeries.length === 0
											? "No hay series de reuniones definidas para este GDI."
											: appliedStartDate && appliedEndDate
												? `No hay instancias para &quot;${selectedSeriesObject?.name || "la selección actual"}&quot; en el rango de fechas`
												: `No hay instancias programadas para &quot;${selectedSeriesObject?.name || "la selección actual"}&quot;`}
									</h2>
									<p className="text-muted-foreground mt-2">
										{groupMeetingSeries.length === 0
											? "Defina una nueva serie para comenzar."
											: appliedStartDate && appliedEndDate
												? `(${format(parseISO(appliedStartDate), "dd/MM/yy", { locale: es })} - ${format(parseISO(appliedEndDate), "dd/MM/yy", { locale: es })})`
												: "Agregue instancias o ajuste los filtros."}
									</p>
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
