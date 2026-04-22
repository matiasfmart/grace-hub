"use client";
import {
	CalendarDays,
	ChevronRight,
	LayoutDashboard,
	Loader2,
	Settings,
	Users,
} from "lucide-react";
import {
	notFound,
	useParams as useNextParams,
	useSearchParams as useNextSearchParams,
	useRouter,
} from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
	GroupAdminSummaryTab,
	GroupAdminMembersTab,
	GroupAdminMeetingsTab,
	GroupAdminSettingsTab,
} from "@/components/groups/admin";
import type {
	AttendanceRecord,
	DefineMeetingSeriesFormValues,
	Meeting,
	MeetingSeries,
	Member,
	MinistryArea,
} from "@/lib/types";
import {
	getAllAttendanceRecords,
	getSeriesForGroup,
	getAllMembersNonPaginated,
	getMinistryAreaById,
	getAllMinistryAreas,
	areasService,
	getMeetingsForGroupWithAttendees,
} from "@/lib/api/services";
import {
	handleAddAreaMeetingSeriesAction,
	handleAddMeetingForCurrentAreaAction,
	handleDeleteAreaMeetingSeriesAction,
	handleUpdateAreaMeetingSeriesAction,
	updateMinistryAreaDetailsAction,
	deleteMinistryAreaAction,
} from "./actions";

type MinistryAreaAdminPageProps = {};

interface MinistryAreaAdminPageData {
	ministryArea: MinistryArea;
	allMembers: Member[];
	activeMembers: Member[];
	allAreas: MinistryArea[];
	groupMeetingSeries: MeetingSeries[];
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	areaMembers: Member[];
}

async function getData(areaId: string): Promise<MinistryAreaAdminPageData> {
	const ministryAreaDetails = await getMinistryAreaById(areaId);
	if (!ministryAreaDetails) notFound();

	const [allMembersData, allAttendanceRecordsData, groupSeriesData, allAreasData, areaMeetingsData] =
		await Promise.all([
			getAllMembersNonPaginated(),
			getAllAttendanceRecords(),
			getSeriesForGroup("ministryArea", areaId),
			getAllMinistryAreas(),
			getMeetingsForGroupWithAttendees("ministryArea", areaId),
		]);

	// Get members of this area
	const areaMemberIds = new Set([
		ministryAreaDetails.leaderId,
		...ministryAreaDetails.memberIds,
	]);
	const areaMembers = allMembersData
		.filter((m) => areaMemberIds.has(m.id))
		.sort((a, b) =>
			`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
		);

	return {
		ministryArea: ministryAreaDetails,
		allMembers: allMembersData,
		activeMembers: allMembersData.filter((m) => m.status === "vigente"),
		allAreas: allAreasData,
		groupMeetingSeries: groupSeriesData.sort((a, b) => a.name.localeCompare(b.name)),
		allMeetings: areaMeetingsData,
		allAttendanceRecords: allAttendanceRecordsData,
		areaMembers,
	};
}

export default function MinistryAreaAdminPage({}: MinistryAreaAdminPageProps) {
	const router = useRouter();
	const paramsFromHook = useNextParams();
	const currentHookSearchParams = useNextSearchParams();
	const { toast } = useToast();

	const areaId = paramsFromHook.areaId as string;
	const activeTab = currentHookSearchParams.get("tab") || "summary";

	const [pageData, setPageData] = useState<MinistryAreaAdminPageData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, startTransition] = useTransition();

	const refreshData = useCallback(async () => {
		if (!areaId) return;
		setIsLoading(true);
		setError(null);
		try {
			const data = await getData(areaId);
			setPageData(data);
		} catch (err) {
			console.error("Failed to load Ministry Area admin data:", err);
			setError((err as Error).message || "Error al cargar datos del Área Ministerial.");
		} finally {
			setIsLoading(false);
		}
	}, [areaId]);

	useEffect(() => {
		refreshData();
	}, [refreshData]);

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(currentHookSearchParams.toString());
		params.set("tab", value);
		router.push(`/groups/ministry-areas/${areaId}/admin?${params.toString()}`);
	};

	const handleAddMembers = (memberIds: string[]) => {
		if (!pageData) return;
		startTransition(async () => {
			try {
				// Add each member
				for (const memberId of memberIds) {
					await areasService.assignMember(areaId, memberId);
				}
				toast({ title: "Éxito", description: `${memberIds.length} miembro(s) agregado(s)` });
				await refreshData();
			} catch (err) {
				toast({
					title: "Error",
					description: (err as Error).message || "Error al agregar miembros",
					variant: "destructive",
				});
			}
		});
	};

	const handleRemoveMember = (memberId: string) => {
		startTransition(async () => {
			try {
				await areasService.removeMember(areaId, memberId);
				toast({ title: "Éxito", description: "Miembro removido del Área" });
				await refreshData();
			} catch (err) {
				toast({
					title: "Error",
					description: (err as Error).message || "Error al remover miembro",
					variant: "destructive",
				});
			}
		});
	};

	const handleUpdateArea = async (data: {
		name: string;
		leaderId: string;
		mentorId?: string;
		description?: string;
	}) => {
		const result = await updateMinistryAreaDetailsAction(areaId, {
			name: data.name,
			leaderId: data.leaderId,
			mentorId: data.mentorId,
			description: data.description,
		});
		if (result.success) {
			await refreshData();
		}
		return result;
	};

	const handleDeleteArea = async () => {
		const result = await deleteMinistryAreaAction(areaId);
		if (result.success) {
			router.push("/groups");
		}
		return result;
	};

	const handleSeriesChanged = (newSeriesId?: string) => {
		refreshData();
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
				No se pudieron cargar los datos del Área Ministerial.
			</div>
		);
	}

	const {
		ministryArea,
		allMembers,
		activeMembers,
		allAreas,
		groupMeetingSeries,
		allMeetings,
		allAttendanceRecords,
		areaMembers,
	} = pageData;

	const leader = allMembers.find(m => m.id === ministryArea.leaderId);
	const mentor = ministryArea.mentorId ? allMembers.find(m => m.id === ministryArea.mentorId) : null;

	return (
		<div className="container mx-auto py-6 px-4 space-y-6">
			{/* Breadcrumbs */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/groups">Grupos</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator>
						<ChevronRight className="h-4 w-4" />
					</BreadcrumbSeparator>
					<BreadcrumbItem>
						<BreadcrumbLink href="/groups?tab=areas">Áreas</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator>
						<ChevronRight className="h-4 w-4" />
					</BreadcrumbSeparator>
					<BreadcrumbItem>
						<BreadcrumbPage>{ministryArea.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<Card>
				<CardHeader className="pb-4">
					<CardTitle className="text-2xl md:text-3xl text-primary">{ministryArea.name}</CardTitle>
					<CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
						<span>Líder: {leader ? `${leader.firstName} ${leader.lastName}` : "No asignado"}</span>
						{mentor && <span>· Mentor: {mentor.firstName} {mentor.lastName}</span>}
						<span>· {areaMembers.length} miembros</span>
					</CardDescription>
					{ministryArea.description && (
						<p className="text-sm text-muted-foreground pt-2">{ministryArea.description}</p>
					)}
				</CardHeader>
			</Card>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
				<TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-card/60 shadow-sm border">
					<TabsTrigger value="summary" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
						<LayoutDashboard className="h-4 w-4" />
						<span className="hidden sm:inline">Resumen</span>
					</TabsTrigger>
					<TabsTrigger value="members" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
						<Users className="h-4 w-4" />
						<span className="hidden sm:inline">Miembros</span>
					</TabsTrigger>
					<TabsTrigger value="meetings" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
						<CalendarDays className="h-4 w-4" />
						<span className="hidden sm:inline">Reuniones</span>
					</TabsTrigger>
					<TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
						<Settings className="h-4 w-4" />
						<span className="hidden sm:inline">Config</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="summary">
					<GroupAdminSummaryTab
						groupName={ministryArea.name}
						groupType="area"
						members={areaMembers}
						leaderId={ministryArea.leaderId}
						leaderLabel="Líder"
						mentorId={ministryArea.mentorId}
						meetingSeries={groupMeetingSeries}
						recentMeetings={allMeetings}
						allAttendanceRecords={allAttendanceRecords}
						allMembers={allMembers}
					/>
				</TabsContent>

				<TabsContent value="members">
					<GroupAdminMembersTab
						groupType="area"
						leaderId={ministryArea.leaderId}
						leaderLabel="Líder"
						mentorId={ministryArea.mentorId}
						memberIds={ministryArea.memberIds}
						allMembers={allMembers}
						activeMembers={activeMembers}
						onAddMembers={handleAddMembers}
						onRemoveMember={handleRemoveMember}
						isUpdating={isUpdating}
					/>
				</TabsContent>

				<TabsContent value="meetings">
					<GroupAdminMeetingsTab
						groupId={ministryArea.id}
						groupType="ministryArea"
						meetingSeries={groupMeetingSeries}
						allMeetings={allMeetings}
						allAttendanceRecords={allAttendanceRecords}
						members={areaMembers}
						leaderId={ministryArea.leaderId}
						onCreateSeries={(data: DefineMeetingSeriesFormValues) =>
							handleAddAreaMeetingSeriesAction(ministryArea.id, data)
						}
						onUpdateSeries={(seriesId, data) =>
							handleUpdateAreaMeetingSeriesAction(ministryArea.id, seriesId, data)
						}
						onDeleteSeries={(seriesId) =>
							handleDeleteAreaMeetingSeriesAction(ministryArea.id, seriesId)
						}
						onAddMeeting={(seriesId, data) =>
							handleAddMeetingForCurrentAreaAction(ministryArea.id, seriesId, data)
						}
						onSeriesChanged={handleSeriesChanged}
					/>
				</TabsContent>

				<TabsContent value="settings">
					<GroupAdminSettingsTab
						groupType="area"
						group={ministryArea}
						allMembers={allMembers}
						activeMembers={activeMembers}
						allGroups={allAreas}
						onUpdate={handleUpdateArea}
						onDelete={handleDeleteArea}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
