"use client";

import { CalendarDays, ChevronRight, LayoutDashboard, Settings, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
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
	Meeting,
	MeetingSeries,
	Member,
	MinistryArea,
} from "@/lib/types";
import {
	assignAreaMembersAction,
	removeAreaMemberAction,
	handleAddAreaMeetingSeriesAction,
	handleAddMeetingForCurrentAreaAction,
	handleDeleteAreaMeetingSeriesAction,
	handleUpdateAreaMeetingSeriesAction,
	updateMinistryAreaDetailsAction,
	deleteMinistryAreaAction,
} from "./actions";

interface MinistryAreaAdminViewProps {
	ministryArea: MinistryArea;
	allMembers: Member[];
	activeMembers: Member[];
	allAreas: MinistryArea[];
	groupMeetingSeries: MeetingSeries[];
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	areaMembers: Member[];
}

export function MinistryAreaAdminView({
	ministryArea,
	allMembers,
	activeMembers,
	allAreas,
	groupMeetingSeries,
	allMeetings,
	allAttendanceRecords,
	areaMembers,
}: MinistryAreaAdminViewProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();

	const activeTab = searchParams.get("tab") || "summary";
	const [isUpdating, startTransition] = useTransition();

	const leader = allMembers.find((m) => m.id === ministryArea.leaderId);
	const mentor = ministryArea.mentorId ? allMembers.find((m) => m.id === ministryArea.mentorId) : null;

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", value);
		router.push(`/groups/ministry-areas/${ministryArea.id}/admin?${params.toString()}`);
	};

	const handleAddMembers = (memberIds: string[]) => {
		startTransition(async () => {
			const result = await assignAreaMembersAction(ministryArea.id, memberIds);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const handleRemoveMember = (memberId: string) => {
		startTransition(async () => {
			const result = await removeAreaMemberAction(ministryArea.id, memberId);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const handleUpdateArea = async (data: {
		name: string;
		leaderId: string;
		mentorId?: string;
		description?: string;
	}) => {
		const result = await updateMinistryAreaDetailsAction(ministryArea.id, {
			name: data.name,
			leaderId: data.leaderId,
			mentorId: data.mentorId,
			description: data.description,
		});
		if (result.success) {
			router.refresh();
		}
		return result;
	};

	const handleDeleteArea = async () => {
		const result = await deleteMinistryAreaAction(ministryArea.id);
		if (result.success) {
			router.push("/groups");
		}
		return result;
	};

	const handleSeriesChanged = () => {
		router.refresh();
	};

	return (
		<div className="container mx-auto py-6 px-4 space-y-6">
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
						groupId={ministryArea.id}
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
						groupName={ministryArea.name}
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
						groupName={ministryArea.name}
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
