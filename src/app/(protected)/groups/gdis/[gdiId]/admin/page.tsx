"use client";
import { CalendarDays, ChevronRight, LayoutDashboard, Loader2, Settings, Users } from "lucide-react";
import Link from "next/link";
import {
	notFound,
	useParams as useNextParams,
	useSearchParams as useNextSearchParams,
	useRouter,
} from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
	GroupAdminSummaryTab,
	GroupAdminMembersTab,
	GroupAdminMeetingsTab,
	GroupAdminSettingsTab,
} from "@/components/groups/admin";
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
	getSeriesForGroup,
	getAllMembersNonPaginated,
	getMeetingsForGroupWithAttendees,
} from "@/lib/api/services";
import { gdisService } from "@/lib/api/services/gdisService";
import {
	handleAddGdiMeetingSeriesAction,
	handleAddMeetingForCurrentGDIAction,
	handleDeleteGdiMeetingSeriesAction,
	handleUpdateGdiMeetingSeriesAction,
	updateGdiDetailsAction,
	deleteGdiAction,
} from "./actions";

type GdiAdminPageProps = {};

interface GdiAdminPageData {
	gdi: GDI;
	allMembers: Member[];
	activeMembers: Member[];
	allGdis: GDI[];
	groupMeetingSeries: MeetingSeries[];
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	gdiMembers: Member[];
}

async function getData(gdiId: string): Promise<GdiAdminPageData> {
	const gdiDetails = await getGdiById(gdiId);
	if (!gdiDetails) notFound();

	const [
		allMembersData,
		allGdisData,
		allAttendanceRecordsData,
		groupSeriesData,
		gdiMeetingsData,
	] = await Promise.all([
		getAllMembersNonPaginated(),
		getAllGdis(),
		getAllAttendanceRecords(),
		getSeriesForGroup("gdi", gdiId),
		getMeetingsForGroupWithAttendees("gdi", gdiId),
	]);

	const sortedGroupSeries = groupSeriesData.sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	// Get GDI members
	const gdiMemberIds = new Set([gdiDetails.guideId, ...gdiDetails.memberIds]);
	const gdiMembers = allMembersData
		.filter((member) => gdiMemberIds.has(member.id))
		.sort((a, b) =>
			`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
		);

	return {
		gdi: gdiDetails,
		allMembers: allMembersData,
		activeMembers: allMembersData.filter((m) => m.status === "vigente"),
		allGdis: allGdisData,
		groupMeetingSeries: sortedGroupSeries,
		allMeetings: gdiMeetingsData,
		allAttendanceRecords: allAttendanceRecordsData,
		gdiMembers,
	};
}

export default function GdiAdminPage({}: GdiAdminPageProps) {
	const router = useRouter();
	const paramsFromHook = useNextParams();
	const currentHookSearchParams = useNextSearchParams();
	const { toast } = useToast();

	const gdiId = paramsFromHook.gdiId as string;
	const activeTab = currentHookSearchParams.get("tab") || "summary";

	const [pageData, setPageData] = useState<GdiAdminPageData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, startTransition] = useTransition();

	const refreshData = useCallback(async () => {
		if (!gdiId) return;
		setIsLoading(true);
		setError(null);
		try {
			const data = await getData(gdiId);
			setPageData(data);
		} catch (err) {
			console.error("Failed to load GDI admin data:", err);
			setError((err as Error).message || "Error al cargar datos del GDI.");
		} finally {
			setIsLoading(false);
		}
	}, [gdiId]);

	useEffect(() => {
		refreshData();
	}, [refreshData]);

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(currentHookSearchParams.toString());
		params.set("tab", value);
		router.push(`/groups/gdis/${gdiId}/admin?${params.toString()}`);
	};

	const handleAddMembers = (memberIds: string[]) => {
		if (!pageData) return;
		startTransition(async () => {
			try {
				// Add each member
				for (const memberId of memberIds) {
					await gdisService.assignMember(gdiId, memberId);
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
				await gdisService.removeMember(gdiId, memberId);
				toast({ title: "Éxito", description: "Miembro removido del GDI" });
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

	const handleUpdateGdi = async (data: {
		name: string;
		leaderId: string;
		mentorId?: string;
	}) => {
		const result = await updateGdiDetailsAction(gdiId, {
			name: data.name,
			guideId: data.leaderId,
			mentorId: data.mentorId,
		});
		if (result.success) {
			await refreshData();
		}
		return result;
	};

	const handleDeleteGdi = async () => {
		const result = await deleteGdiAction(gdiId);
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
		allMeetings,
		allAttendanceRecords,
		gdiMembers,
	} = pageData;

	const guide = allMembers.find(m => m.id === gdi.guideId);
	const mentor = gdi.mentorId ? allMembers.find(m => m.id === gdi.mentorId) : null;

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
						<BreadcrumbLink href="/groups?tab=gdis">GDIs</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator>
						<ChevronRight className="h-4 w-4" />
					</BreadcrumbSeparator>
					<BreadcrumbItem>
						<BreadcrumbPage>{gdi.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<Card>
				<CardHeader className="pb-4">
					<CardTitle className="text-2xl md:text-3xl text-primary">{gdi.name}</CardTitle>
					<CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
						<span>Guía: {guide ? `${guide.firstName} ${guide.lastName}` : "No asignado"}</span>
						{mentor && <span>· Mentor: {mentor.firstName} {mentor.lastName}</span>}
						<span>· {gdiMembers.length} miembros</span>
					</CardDescription>
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
						groupName={gdi.name}
						groupType="gdi"
						members={gdiMembers}
						leaderId={gdi.guideId}
						leaderLabel="Guía"
						mentorId={gdi.mentorId}
						meetingSeries={groupMeetingSeries}
						recentMeetings={allMeetings}
						allAttendanceRecords={allAttendanceRecords}
						allMembers={allMembers}
					/>
				</TabsContent>

				<TabsContent value="members">
					<GroupAdminMembersTab
						groupType="gdi"
						leaderId={gdi.guideId}
						leaderLabel="Guía"
						mentorId={gdi.mentorId}
						memberIds={gdi.memberIds}
						allMembers={allMembers}
						activeMembers={activeMembers}
						onAddMembers={handleAddMembers}
						onRemoveMember={handleRemoveMember}
						isUpdating={isUpdating}
					/>
				</TabsContent>

				<TabsContent value="meetings">
					<GroupAdminMeetingsTab
						groupId={gdi.id}
						groupType="gdi"
						meetingSeries={groupMeetingSeries}
						allMeetings={allMeetings}
						allAttendanceRecords={allAttendanceRecords}
						members={gdiMembers}
						leaderId={gdi.guideId}
						onCreateSeries={(data: DefineMeetingSeriesFormValues) =>
							handleAddGdiMeetingSeriesAction(gdi.id, data)
						}
						onUpdateSeries={(seriesId, data) =>
							handleUpdateGdiMeetingSeriesAction(gdi.id, seriesId, data)
						}
						onDeleteSeries={(seriesId) =>
							handleDeleteGdiMeetingSeriesAction(gdi.id, seriesId)
						}
						onAddMeeting={(seriesId, data) =>
							handleAddMeetingForCurrentGDIAction(gdi.id, seriesId, data)
						}
						onSeriesChanged={handleSeriesChanged}
					/>
				</TabsContent>

				<TabsContent value="settings">
					<GroupAdminSettingsTab
						groupType="gdi"
						group={gdi}
						allMembers={allMembers}
						activeMembers={activeMembers}
						allGroups={allGdis}
						onUpdate={handleUpdateGdi}
						onDelete={handleDeleteGdi}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
