"use client";

import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type {
	AttendanceRecord,
	Meeting,
	MeetingSeries,
	Member,
} from "@/lib/types";

interface AttendanceBreakdownChartProps {
	meetingsForPeriod: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	allMembers: Member[];
	allMeetingSeries: MeetingSeries[];
	selectedPeriodLabel?: string;
}

interface BreakdownDataPoint {
	name: string;
	Asistentes: number;
	Ausentes: number;
	Pendientes: number;
}

export default function AttendanceBreakdownChart({
	meetingsForPeriod = [],
	allAttendanceRecords = [],
	allMembers = [],
	allMeetingSeries = [],
	selectedPeriodLabel,
}: AttendanceBreakdownChartProps) {
	const chartData = useMemo(() => {
		const _totalAttended = 0;
		let totalExpected = 0;

		meetingsForPeriod.forEach((meeting) => {
			const parentSeries = allMeetingSeries.find(
				(s) => s.id === meeting.seriesId,
			);
			let expectedUidsForThisMeeting: string[] = [];

			if (
				parentSeries?.seriesType === "general" &&
				(parentSeries.targetAttendeeGroups || []).includes("allMembers")
			) {
				expectedUidsForThisMeeting = allMembers.map((m) => m.id);
			} else if (meeting.attendeeUids && meeting.attendeeUids.length > 0) {
				expectedUidsForThisMeeting = meeting.attendeeUids;
			}
			// If no specific UIDs and not 'allMembers' general, expected might be 0 for this meeting
			// or could be derived from specific GDI/Area if logic existed here for it.
			// For now, this setup relies on meeting.attendeeUids being populated or targetAttendeeGroups
			totalExpected += expectedUidsForThisMeeting.length;
		});

		const reportedAttended = allAttendanceRecords.filter(
			(r) => meetingsForPeriod.some((m) => m.id === r.meetingId) && r.attended,
		).length;

		const reportedAbsent = allAttendanceRecords.filter(
			(r) => meetingsForPeriod.some((m) => m.id === r.meetingId) && !r.attended,
		).length;

		// Calculate pending based on totalExpected minus those reported (attended or absent)
		// Ensure pending is not negative.
		const pending = Math.max(
			0,
			totalExpected - (reportedAttended + reportedAbsent),
		);

		const data: BreakdownDataPoint[] = [
			{
				name: selectedPeriodLabel || "Periodo",
				Asistentes: reportedAttended,
				Ausentes: reportedAbsent,
				Pendientes: pending,
			},
		];
		return data;
	}, [
		meetingsForPeriod,
		allAttendanceRecords,
		allMembers,
		allMeetingSeries,
		selectedPeriodLabel,
	]);

	return (
		<ResponsiveContainer width="100%" height={300}>
			<BarChart
				data={chartData}
				margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
			>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					type="category"
					dataKey="name"
					tick={{ fontSize: 12 }}
					interval={0}
				/>
				<YAxis type="number" allowDecimals={false} />
				<Tooltip />
				<Legend wrapperStyle={{ fontSize: "12px" }} />
				<Bar
					dataKey="Asistentes"
					fill="hsl(var(--primary))"
					barSize={35}
					radius={[4, 4, 0, 0]}
				/>
				<Bar
					dataKey="Ausentes"
					fill="hsl(var(--destructive))"
					barSize={35}
					radius={[4, 4, 0, 0]}
				/>
				<Bar
					dataKey="Pendientes"
					fill="hsl(var(--muted-foreground))"
					barSize={35}
					radius={[4, 4, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
