"use client";

import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	ClipboardCheck,
	Clock,
	TrendingDown,
	TrendingUp,
	UserX,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceRecord, Meeting, MeetingSeries, Member } from "@/lib/types";

interface GroupAdminSummaryTabProps {
	groupName: string;
	groupType: "gdi" | "area";
	groupId: string;
	members: Member[];
	leaderId: string;
	leaderLabel: string;
	mentorId?: string;
	meetingSeries: MeetingSeries[];
	recentMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	allMembers: Member[];
}

export default function GroupAdminSummaryTab({
	groupType,
	groupId,
	members,
	leaderId,
	leaderLabel,
	mentorId,
	meetingSeries,
	recentMeetings,
	allAttendanceRecords,
	allMembers,
}: GroupAdminSummaryTabProps) {
	const now = new Date();

	// Reunión anterior más reciente
	const lastMeeting = useMemo(() => {
		return recentMeetings
			.filter(m => new Date(m.date) < now)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;
	}, [recentMeetings]);

	// Próxima reunión
	const nextMeeting = useMemo(() => {
		return recentMeetings
			.filter(m => new Date(m.date) >= now)
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
	}, [recentMeetings]);

	// Días desde la última reunión
	const daysSinceLastMeeting = lastMeeting
		? Math.floor((now.getTime() - new Date(lastMeeting.date).getTime()) / (1000 * 60 * 60 * 24))
		: null;

	// KPIs globales
	const stats = useMemo(() => {
		const activeMemberCount = members.filter(m => m.status === "vigente").length;

		let totalRate = 0;
		let meetingsWithAttendance = 0;
		for (const meeting of recentMeetings.filter(m => new Date(m.date) < now)) {
			const records = allAttendanceRecords.filter(r => r.meetingId === meeting.id);

			// Deduplicar: un registro por miembro (el último gana si hay duplicados)
			const memberMap = new Map<string, boolean>();
			for (const r of records) {
				memberMap.set(r.memberId, r.attended);
			}

			if (memberMap.size === 0) continue; // sin registros → no contar esta reunión

			const uniquePresentCount = [...memberMap.values()].filter(Boolean).length;
			// expectedCount: attendeeUids del encuentro → fallback registros únicos → fallback miembros activos
			const expectedCount =
				(meeting.attendeeUids?.length ?? 0) > 0
					? meeting.attendeeUids.length
					: memberMap.size > 0
						? memberMap.size
						: members.filter(m => m.status === "vigente").length;

			if (expectedCount > 0) {
				// Capeado a 100% para evitar valores absurdos por datos inconsistentes
				totalRate += Math.min(100, (uniquePresentCount / expectedCount) * 100);
				meetingsWithAttendance++;
			}
		}
		const avgAttendance = meetingsWithAttendance > 0 ? Math.round(totalRate / meetingsWithAttendance) : null;

		return { activeMemberCount, avgAttendance };
	}, [members, recentMeetings, allAttendanceRecords]);

	// Integrantes en riesgo (asistencia < 40%, con al menos 2 reuniones esperadas)
	const membersAtRisk = useMemo(() => {
		const pastMeetings = recentMeetings.filter(m => new Date(m.date) < now);
		return members
			.filter(m => m.status === "vigente")
			.map(member => {
				let expected = 0;
				let present = 0;
				for (const meeting of pastMeetings) {
					const isExpected = meeting.attendeeUids
						? meeting.attendeeUids.includes(member.id)
						: true;
					if (isExpected) {
						expected++;
						const record = allAttendanceRecords.find(
							r => r.memberId === member.id && r.meetingId === meeting.id
						);
						if (record?.attended) present++;
					}
				}
				if (expected < 2) return null;
				const rate = Math.round((present / expected) * 100);
				if (rate >= 40) return null;

				// Última vez que asistió
				const lastAttendedMeetingId = allAttendanceRecords
					.filter(r => r.memberId === member.id && r.attended)
					.map(r => pastMeetings.find(m => m.id === r.meetingId))
					.filter((m): m is Meeting => !!m)
					.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;

				const daysSince = lastAttendedMeetingId
					? Math.floor((now.getTime() - new Date(lastAttendedMeetingId).getTime()) / (1000 * 60 * 60 * 24))
					: null;

				return { member, rate, expected, present, daysSince };
			})
			.filter((x): x is NonNullable<typeof x> => x !== null)
			.sort((a, b) => a.rate - b.rate)
			.slice(0, 5);
	}, [members, recentMeetings, allAttendanceRecords]);

	const leader = allMembers.find(m => m.id === leaderId);
	const mentor = mentorId ? allMembers.find(m => m.id === mentorId) : null;

	const attendancePath = (meetingId: string) =>
		groupType === "gdi"
			? `/groups/gdis/${groupId}/meetings/${meetingId}/attendance`
			: `/groups/ministry-areas/${groupId}/meetings/${meetingId}/attendance`;

	const nextMeetingSeries = nextMeeting
		? meetingSeries.find(s => s.id === nextMeeting.seriesId)
		: null;

	return (
		<div className="space-y-6">
			{/* Métricas de salud */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card className={`border-l-4 ${
					stats.avgAttendance === null ? "border-l-muted" :
					stats.avgAttendance >= 70 ? "border-l-emerald-500" :
					stats.avgAttendance >= 50 ? "border-l-amber-400" : "border-l-destructive"
				}`}>
					<CardContent className="p-4 flex items-center gap-3">
						{stats.avgAttendance !== null && stats.avgAttendance >= 70
							? <TrendingUp className="h-8 w-8 text-emerald-500 shrink-0" />
							: <TrendingDown className={`h-8 w-8 shrink-0 ${stats.avgAttendance !== null && stats.avgAttendance < 50 ? "text-destructive" : "text-amber-400"}`} />
						}
						<div>
							<p className="text-2xl font-bold">
								{stats.avgAttendance !== null ? `${stats.avgAttendance}%` : "—"}
							</p>
							<p className="text-xs text-muted-foreground">Asistencia promedio</p>
						</div>
					</CardContent>
				</Card>

				<Card className={`border-l-4 ${
					daysSinceLastMeeting === null ? "border-l-muted" :
					daysSinceLastMeeting <= 7 ? "border-l-emerald-500" :
					daysSinceLastMeeting <= 14 ? "border-l-amber-400" : "border-l-destructive"
				}`}>
					<CardContent className="p-4 flex items-center gap-3">
						<Clock className="h-8 w-8 text-muted-foreground shrink-0" />
						<div>
							<p className="text-2xl font-bold">
								{daysSinceLastMeeting !== null ? `${daysSinceLastMeeting}d` : "—"}
							</p>
							<p className="text-xs text-muted-foreground">
								{daysSinceLastMeeting !== null ? "Desde última reunión" : "Sin reuniones pasadas"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-blue-400">
					<CardContent className="p-4 flex items-center gap-3">
						<CalendarDays className="h-8 w-8 text-blue-400 shrink-0" />
						<div>
							<p className="text-2xl font-bold">{stats.activeMemberCount}</p>
							<p className="text-xs text-muted-foreground">
								Integrantes · {meetingSeries.length} {meetingSeries.length === 1 ? "serie" : "series"}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid md:grid-cols-2 gap-6">
				{/* Panel de integrantes en riesgo */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base flex items-center gap-2">
							{membersAtRisk.length > 0
								? <><UserX className="h-4 w-4 text-destructive" /> {membersAtRisk.length} en riesgo</>
								: <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sin integrantes en riesgo</>
							}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{membersAtRisk.length > 0 ? (
							<div className="space-y-2">
								{membersAtRisk.map(({ member, rate, daysSince }) => (
									<div key={member.id} className="flex items-center justify-between gap-2 py-1">
										<div className="flex items-center gap-2 min-w-0">
											<div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
												<span className="text-xs font-medium text-destructive">
													{member.firstName[0]}{member.lastName[0]}
												</span>
											</div>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">
													{member.firstName} {member.lastName}
												</p>
												{daysSince !== null && (
													<p className="text-xs text-muted-foreground">
														hace {daysSince}d sin asistir
													</p>
												)}
											</div>
										</div>
										<Badge
											variant="destructive"
											className="text-xs shrink-0"
										>
											{rate}%
										</Badge>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground text-center py-4">
								Todos los integrantes tienen más del 40% de asistencia.
							</p>
						)}
					</CardContent>
				</Card>

				{/* Próxima reunión + acción directa */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base flex items-center gap-2">
							<CalendarDays className="h-4 w-4 text-primary" />
							Próxima reunión
						</CardTitle>
					</CardHeader>
					<CardContent>
						{nextMeeting ? (
							<div className="space-y-3">
								<div>
									<p className="font-medium">
										{new Date(nextMeeting.date).toLocaleDateString("es-ES", {
											weekday: "long",
											day: "numeric",
											month: "long",
										})}
									</p>
									{nextMeetingSeries && (
										<p className="text-sm text-muted-foreground">{nextMeetingSeries.name}</p>
									)}
									{nextMeeting.time && (
										<p className="text-xs text-muted-foreground">{nextMeeting.time}</p>
									)}
								</div>
								<Button asChild size="sm" className="w-full">
									<Link href={attendancePath(nextMeeting.id)}>
										<ClipboardCheck className="mr-2 h-4 w-4" />
										Tomar asistencia
									</Link>
								</Button>
							</div>
						) : (
							<div className="text-center py-4 space-y-3">
								{daysSinceLastMeeting !== null && daysSinceLastMeeting > 14 && (
									<div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 justify-center">
										<AlertTriangle className="h-4 w-4" />
										<span className="text-sm">Sin actividad en {daysSinceLastMeeting} días</span>
									</div>
								)}
								<p className="text-sm text-muted-foreground">No hay reuniones próximas programadas.</p>
								<Button asChild variant="outline" size="sm" className="w-full">
									<Link href="?tab=meetings">
										Programar reunión →
									</Link>
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Información del grupo */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Liderazgo</CardTitle>
				</CardHeader>
				<CardContent className="grid sm:grid-cols-2 gap-3">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-sm font-medium text-primary">
								{leader ? `${leader.firstName[0]}${leader.lastName[0]}` : "??"}
							</span>
						</div>
						<div>
							<p className="font-medium text-sm">
								{leader ? `${leader.firstName} ${leader.lastName}` : "Sin asignar"}
							</p>
							<p className="text-xs text-muted-foreground">{leaderLabel}</p>
						</div>
					</div>
					{mentor && (
						<div className="flex items-center gap-3">
							<div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
								<span className="text-sm font-medium text-blue-600 dark:text-blue-400">
									{mentor.firstName[0]}{mentor.lastName[0]}
								</span>
							</div>
							<div>
								<p className="font-medium text-sm">
									{mentor.firstName} {mentor.lastName}
								</p>
								<p className="text-xs text-muted-foreground">Mentor</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
