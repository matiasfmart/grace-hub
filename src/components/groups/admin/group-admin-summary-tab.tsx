"use client";

import { CalendarDays, TrendingUp, Users, ListChecks } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceRecord, Meeting, MeetingSeries, Member } from "@/lib/types";

interface GroupAdminSummaryTabProps {
	groupName: string;
	groupType: "gdi" | "area";
	members: Member[];
	leaderId: string; // guideId for GDI, leaderId for Area
	leaderLabel: string; // "Guía" or "Líder"
	mentorId?: string;
	meetingSeries: MeetingSeries[];
	recentMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	allMembers: Member[];
}

export default function GroupAdminSummaryTab({
	groupName,
	groupType,
	members,
	leaderId,
	leaderLabel,
	mentorId,
	meetingSeries,
	recentMeetings,
	allAttendanceRecords,
	allMembers,
}: GroupAdminSummaryTabProps) {
	// Calculate KPIs
	const stats = useMemo(() => {
		const activeMemberCount = members.filter(m => m.status === "vigente").length;
		const totalMemberCount = members.length;
		const activeSeriesCount = meetingSeries.length;
		
		// Calculate average attendance for recent meetings
		let avgAttendance = 0;
		if (recentMeetings.length > 0) {
			const attendanceTotals = recentMeetings.map(meeting => {
				const records = allAttendanceRecords.filter(
					r => r.meetingId === meeting.id && r.wasPresent
				);
				const expected = meeting.attendeeUids?.length || members.length;
				return expected > 0 ? (records.length / expected) * 100 : 0;
			});
			avgAttendance = attendanceTotals.reduce((a, b) => a + b, 0) / attendanceTotals.length;
		}

		// Get this month's meetings
		const now = new Date();
		const thisMonthMeetings = recentMeetings.filter(m => {
			const meetingDate = new Date(m.date);
			return meetingDate.getMonth() === now.getMonth() && 
				   meetingDate.getFullYear() === now.getFullYear();
		});

		return {
			activeMemberCount,
			totalMemberCount,
			avgAttendance: Math.round(avgAttendance),
			thisMonthMeetings: thisMonthMeetings.length,
			activeSeriesCount,
		};
	}, [members, meetingSeries, recentMeetings, allAttendanceRecords]);

	// Get upcoming meetings (next 5)
	const upcomingMeetings = useMemo(() => {
		const now = new Date();
		return recentMeetings
			.filter(m => new Date(m.date) >= now)
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.slice(0, 5);
	}, [recentMeetings]);

	// Get recent activity (last 5 meetings with attendance)
	const recentActivity = useMemo(() => {
		const now = new Date();
		return recentMeetings
			.filter(m => new Date(m.date) < now)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 5)
			.map(meeting => {
				const presentCount = allAttendanceRecords.filter(
					r => r.meetingId === meeting.id && r.wasPresent
				).length;
				const expectedCount = meeting.attendeeUids?.length || members.length;
				const percentage = expectedCount > 0 
					? Math.round((presentCount / expectedCount) * 100) 
					: 0;
				return {
					meeting,
					presentCount,
					expectedCount,
					percentage,
				};
			});
	}, [recentMeetings, allAttendanceRecords, members]);

	const leader = allMembers.find(m => m.id === leaderId);
	const mentor = mentorId ? allMembers.find(m => m.id === mentorId) : null;

	return (
		<div className="space-y-6">
			{/* KPI Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Miembros</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.activeMemberCount}</div>
						<p className="text-xs text-muted-foreground">
							{stats.totalMemberCount > stats.activeMemberCount 
								? `${stats.totalMemberCount} total` 
								: "activos"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Asistencia</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.avgAttendance}%</div>
						<p className="text-xs text-muted-foreground">promedio reciente</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Este Mes</CardTitle>
						<CalendarDays className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.thisMonthMeetings}</div>
						<p className="text-xs text-muted-foreground">reuniones</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Series</CardTitle>
						<ListChecks className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.activeSeriesCount}</div>
						<p className="text-xs text-muted-foreground">activas</p>
					</CardContent>
				</Card>
			</div>

			{/* Group Info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Información del Grupo</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="flex justify-between">
						<span className="text-muted-foreground">{leaderLabel}:</span>
						<span className="font-medium">
							{leader ? `${leader.firstName} ${leader.lastName}` : "No asignado"}
						</span>
					</div>
					{groupType === "gdi" || mentorId ? (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Mentor:</span>
							<span className="font-medium">
								{mentor ? `${mentor.firstName} ${mentor.lastName}` : "No asignado"}
							</span>
						</div>
					) : null}
					<div className="flex justify-between">
						<span className="text-muted-foreground">Total miembros:</span>
						<span className="font-medium">{stats.totalMemberCount}</span>
					</div>
				</CardContent>
			</Card>

			<div className="grid md:grid-cols-2 gap-6">
				{/* Upcoming Meetings */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Próximas Reuniones</CardTitle>
					</CardHeader>
					<CardContent>
						{upcomingMeetings.length > 0 ? (
							<div className="space-y-3">
								{upcomingMeetings.map(meeting => {
									const series = meetingSeries.find(s => s.id === meeting.seriesId);
									return (
										<div key={meeting.id} className="flex items-center justify-between text-sm">
											<div className="flex items-center gap-2">
												<CalendarDays className="h-4 w-4 text-muted-foreground" />
												<span>
													{new Date(meeting.date).toLocaleDateString("es-ES", {
														day: "numeric",
														month: "short",
													})}
												</span>
												<span className="text-muted-foreground">
													{series?.name || "Reunión"}
												</span>
											</div>
											<span className="text-muted-foreground">{meeting.time}</span>
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-sm text-muted-foreground text-center py-4">
								No hay reuniones programadas
							</p>
						)}
					</CardContent>
				</Card>

				{/* Recent Activity */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Actividad Reciente</CardTitle>
					</CardHeader>
					<CardContent>
						{recentActivity.length > 0 ? (
							<div className="space-y-3">
								{recentActivity.map(({ meeting, presentCount, expectedCount, percentage }) => {
									const series = meetingSeries.find(s => s.id === meeting.seriesId);
									return (
										<div key={meeting.id} className="flex items-center justify-between text-sm">
											<div className="flex items-center gap-2">
												<span>
													{new Date(meeting.date).toLocaleDateString("es-ES", {
														day: "numeric",
														month: "short",
													})}
												</span>
												<span className="text-muted-foreground">
													{series?.name || "Reunión"}
												</span>
											</div>
											<span className={percentage >= 80 ? "text-green-600" : percentage >= 60 ? "text-yellow-600" : "text-red-600"}>
												{presentCount}/{expectedCount} ({percentage}%)
											</span>
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-sm text-muted-foreground text-center py-4">
								No hay actividad reciente
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
