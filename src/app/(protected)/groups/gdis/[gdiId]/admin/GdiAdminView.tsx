"use client";

import { CalendarDays, ChevronRight, LayoutDashboard, Loader2, Settings, Users } from "lucide-react";
import Link from "next/link";
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
	GDI,
	Meeting,
	MeetingSeries,
	Member,
} from "@/lib/types";
import {
	assignGdiMembersAction,
	removeGdiMemberAction,
	handleAddGdiMeetingSeriesAction,
	handleAddMeetingForCurrentGDIAction,
	handleDeleteGdiMeetingSeriesAction,
	handleUpdateGdiMeetingSeriesAction,
	updateGdiDetailsAction,
	deleteGdiAction,
} from "./actions";

interface GdiAdminViewProps {
	gdi: GDI;
	allMembers: Member[];
	activeMembers: Member[];
	allGdis: GDI[];
	groupMeetingSeries: MeetingSeries[];
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	gdiMembers: Member[];
}

export function GdiAdminView({
	gdi,
	allMembers,
	activeMembers,
	allGdis,
	groupMeetingSeries,
	allMeetings,
	allAttendanceRecords,
	gdiMembers,
}: GdiAdminViewProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();

	const activeTab = searchParams.get("tab") || "summary";
	const [isUpdating, startTransition] = useTransition();

	const guide = allMembers.find((m) => m.id === gdi.guideId);
	const mentor = gdi.mentorId ? allMembers.find((m) => m.id === gdi.mentorId) : null;

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", value);
		router.push(`/groups/gdis/${gdi.id}/admin?${params.toString()}`);
	};

	const handleAddMembers = (memberIds: string[]) => {
		startTransition(async () => {
			const result = await assignGdiMembersAction(gdi.id, memberIds);
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
			const result = await removeGdiMemberAction(gdi.id, memberId);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const handleUpdateGdi = async (data: { name: string; leaderId: string; mentorId?: string }) => {
		const result = await updateGdiDetailsAction(gdi.id, {
			name: data.name,
			guideId: data.leaderId,
			mentorId: data.mentorId,
		});
		if (result.success) {
			router.refresh();
		}
		return result;
	};

	const handleDeleteGdi = async () => {
		const result = await deleteGdiAction(gdi.id);
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
