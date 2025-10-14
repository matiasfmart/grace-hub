"use client";

import {
	endOfDay as dateFnsEndOfDay,
	format,
	isValid,
	parseISO,
	startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRange, LineChart as LineChartIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react"; // Added useEffect
import {
	CartesianGrid,
	Line,
	LineChart as RechartsLineChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { DatePicker } from "@/components/ui/date-picker";
import type { AttendanceRecord, Meeting } from "@/lib/types";

interface GdiOverallAttendanceChartProps {
	gdiMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
}

interface GdiMeetingAttendanceDataPoint {
	meetingDisplay: string; // Formatted string for X-axis
	meetingDateISO: string; // Store the ISO date for sorting
	meetingName: string; // Store the full meeting name for tooltip
	attendedCount: number;
}

const chartConfig = {
	attendedCount: {
		label: "Asistentes por Reunión de GDI",
		color: "hsl(var(--accent))", // Using accent color for GDI chart
	},
} satisfies ChartConfig;

const formatMeetingDisplayForXAxis = (
	dateString: string,
	timeString: string,
	name: string,
	isDuplicateDate: boolean,
): string => {
	try {
		const parsedDate = parseISO(dateString);
		if (!isValid(parsedDate)) {
			return isDuplicateDate
				? `${name.substring(0, 10)}... (${dateString} ${timeString})`
				: `${name.substring(0, 10)}... (${dateString})`;
		}
		const datePart = format(parsedDate, "d MMM", { locale: es });
		if (isDuplicateDate) {
			return `${datePart} ${timeString.substring(0, 5)}`; // e.g., "20 Jun 19:00"
		}
		return datePart; // e.g., "20 Jun"
	} catch (_error) {
		// Fallback if formatting fails
		return isDuplicateDate
			? `${name.substring(0, 10)}... (${dateString} ${timeString})`
			: `${name.substring(0, 10)}... (${dateString})`;
	}
};

export default function GdiOverallAttendanceChart({
	gdiMeetings,
	allAttendanceRecords,
}: GdiOverallAttendanceChartProps) {
	const [startDate, setStartDate] = useState<Date | undefined>(undefined); // Initialize as undefined
	const [endDate, setEndDate] = useState<Date | undefined>(undefined); // Initialize as undefined

	useEffect(() => {
		// Set initial dates on client-side after mount
		setStartDate(startOfDay(new Date()));
		setEndDate(dateFnsEndOfDay(new Date()));
	}, []); // Empty dependency array ensures this runs once on mount

	const meetingsForPeriod = useMemo(() => {
		if (!gdiMeetings || !startDate || !endDate) return []; // Guard against undefined dates
		return gdiMeetings.filter((meeting) => {
			const meetingDateObj = parseISO(meeting.date);
			if (!isValid(meetingDateObj)) return false;

			const isAfterOrOnStartDate = meetingDateObj >= startOfDay(startDate);
			const isBeforeOrOnEndDate = meetingDateObj <= dateFnsEndOfDay(endDate);

			return isAfterOrOnStartDate && isBeforeOrOnEndDate;
		});
	}, [gdiMeetings, startDate, endDate]);

	const chartData = useMemo(() => {
		if (!meetingsForPeriod || meetingsForPeriod.length === 0) {
			return [];
		}

		const dateCounts = new Map<string, number>();
		meetingsForPeriod.forEach((meeting) => {
			dateCounts.set(meeting.date, (dateCounts.get(meeting.date) || 0) + 1);
		});

		const sortedMeetings = [...meetingsForPeriod].sort((a, b) => {
			const dateA = parseISO(a.date).getTime();
			const dateB = parseISO(b.date).getTime();
			if (dateA !== dateB) return dateA - dateB;
			// If dates are same, sort by time
			return (a.time || "00:00").localeCompare(b.time || "00:00");
		});

		return sortedMeetings.map((meeting) => {
			const attendanceForThisMeeting = allAttendanceRecords.filter(
				(r) => r.meetingId === meeting.id && r.attended,
			).length;
			const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;
			return {
				meetingDisplay: formatMeetingDisplayForXAxis(
					meeting.date,
					meeting.time,
					meeting.name,
					isDuplicateDate,
				),
				meetingDateISO: meeting.date,
				meetingName: meeting.name,
				attendedCount: attendanceForThisMeeting,
			};
		});
	}, [meetingsForPeriod, allAttendanceRecords]);

	const cardDescription = useMemo(() => {
		if (startDate && endDate) {
			return `Tendencia de asistencia por reunión de GDI del ${format(startDate, "dd MMM yyyy", { locale: es })} al ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
		} else if (startDate) {
			return `Tendencia de asistencia por reunión de GDI desde el ${format(startDate, "dd MMM yyyy", { locale: es })}.`;
		} else if (endDate) {
			return `Tendencia de asistencia por reunión de GDI hasta el ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
		}
		return "Tendencia general de asistencia por cada reunión de GDI.";
	}, [startDate, endDate]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center">
					<LineChartIcon className="mr-2 h-5 w-5 text-primary" />
					Tendencia de Asistencia a GDIs
				</CardTitle>
				<CardDescription className="flex items-center text-xs pt-1">
					<CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/70" />
					{cardDescription}
				</CardDescription>
				<div className="pt-3">
					<div className="flex flex-col sm:flex-row gap-2 items-end">
						<div className="flex-grow w-full sm:w-auto">
							<label
								htmlFor="gdiTrendStartDateFilter"
								className="text-xs font-medium text-muted-foreground"
							>
								Fecha Inicio
							</label>
							<DatePicker
								date={startDate}
								setDate={setStartDate}
								placeholder="Desde"
							/>
						</div>
						<div className="flex-grow w-full sm:w-auto">
							<label
								htmlFor="gdiTrendEndDateFilter"
								className="text-xs font-medium text-muted-foreground"
							>
								Fecha Fin
							</label>
							<DatePicker
								date={endDate}
								setDate={setEndDate}
								placeholder="Hasta"
							/>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-4 pb-4 pt-0">
				{chartData.length > 0 ? (
					<ChartContainer config={chartConfig} className="h-[300px] w-full">
						<RechartsLineChart
							data={chartData}
							margin={{ top: 5, right: 20, left: -10, bottom: 65 }}
						>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="meetingDisplay"
								tickLine={false}
								axisLine={false}
								tickMargin={10}
								angle={-45}
								textAnchor="end"
								height={80} // Increased height for angled labels
								interval={0} // Show all labels if possible, Recharts might still skip some if too crowded
								tick={{ fontSize: 9 }}
							/>
							<YAxis
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								tickMargin={5}
								tick={{ fontSize: 10 }}
								label={{
									value: "Asistentes por Reunión",
									angle: -90,
									position: "insideLeft",
									offset: 10,
									style: {
										fontSize: "10px",
										fill: "hsl(var(--muted-foreground))",
									},
								}}
							/>
							<Tooltip
								cursor={true}
								content={({ active, payload }) => {
									if (active && payload && payload.length) {
										const data = payload[0]
											.payload as GdiMeetingAttendanceDataPoint;
										return (
											<ChartTooltipContent
												className="w-[220px]"
												label={`${data.meetingName} (${format(parseISO(data.meetingDateISO), "d MMM yy", { locale: es })})`}
												payload={[
													{
														name: "Asistentes",
														value: `${data.attendedCount}`,
														color: "hsl(var(--accent))",
													},
												]}
												indicator="line"
											/>
										);
									}
									return null;
								}}
							/>
							<Line
								dataKey="attendedCount"
								type="linear"
								stroke="var(--color-attendedCount)"
								strokeWidth={2}
								dot={{
									fill: "var(--color-attendedCount)",
									r: 3,
								}}
								activeDot={{
									r: 5,
								}}
								name="Asistentes"
								connectNulls={true} // Connect line even if some data points are missing
							/>
						</RechartsLineChart>
					</ChartContainer>
				) : (
					<div className="flex items-center justify-center h-64">
						<p className="text-muted-foreground">
							No hay datos de asistencia a GDIs para el período seleccionado.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
