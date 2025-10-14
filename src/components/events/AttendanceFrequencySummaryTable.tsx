"use client";

import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, CalendarRange } from "lucide-react";
import { useMemo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart as RechartsLineChart, // Renamed to avoid conflict if any
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
import type { AttendanceRecord, Meeting } from "@/lib/types";

interface AttendanceLineChartProps {
	meetingsForSeries: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	seriesName: string;
	filterStartDate?: string;
	filterEndDate?: string;
	expectedAttendeesMap: Record<string, Set<string>>;
}

interface ChartDataPoint {
	meetingDisplay: string;
	attendedCount: number;
	expectedCount: number;
}

const formatMeetingDisplay = (
	dateString: string,
	timeString: string,
	name: string,
	isDuplicateDate: boolean,
): string => {
	try {
		const parsedDate = parseISO(dateString);
		if (!isValid(parsedDate)) {
			return isDuplicateDate
				? `${name.substring(0, 15)}... (${dateString} ${timeString})`
				: `${name.substring(0, 15)}... (${dateString})`;
		}
		const datePart = format(parsedDate, "d MMM yy", { locale: es });
		if (isDuplicateDate) {
			return `${name.substring(0, 15)}... (${datePart} ${timeString})`;
		}
		return `${name.substring(0, 15)}... (${datePart})`;
	} catch (_error) {
		return isDuplicateDate
			? `${name.substring(0, 15)}... (${dateString} ${timeString})`
			: `${name.substring(0, 15)}... (${dateString})`;
	}
};

const formatDateRangeText = (startDate?: string, endDate?: string): string => {
	if (startDate && endDate) {
		try {
			const parsedStart = parseISO(startDate);
			const parsedEnd = parseISO(endDate);
			if (!isValid(parsedStart) || !isValid(parsedEnd))
				return "Rango de fechas inválido";
			const formattedStart = format(parsedStart, "dd/MM/yy", { locale: es });
			const formattedEnd = format(parsedEnd, "dd/MM/yy", { locale: es });
			return `Progresión de asistencia para instancias entre ${formattedStart} y ${formattedEnd}`;
		} catch (_e) {
			return "Rango de fechas inválido";
		}
	}
	return `Progresión de asistencia para todas las instancias visibles de la serie.`;
};

const chartConfig = {
	attendedCount: {
		label: "Asistentes",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig;

export default function AttendanceLineChart({
	meetingsForSeries,
	allAttendanceRecords,
	seriesName,
	filterStartDate,
	filterEndDate,
	expectedAttendeesMap,
}: AttendanceLineChartProps) {
	const chartData = useMemo(() => {
		if (!meetingsForSeries || meetingsForSeries.length === 0) {
			return [];
		}

		const dateCounts = new Map<string, number>();
		meetingsForSeries.forEach((meeting) => {
			dateCounts.set(meeting.date, (dateCounts.get(meeting.date) || 0) + 1);
		});

		// Sort meetings by date ascending for correct line chart progression
		const sortedMeetings = [...meetingsForSeries].sort(
			(a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
		);

		const data: ChartDataPoint[] = sortedMeetings.map((meeting) => {
			const expectedUids = expectedAttendeesMap[meeting.id] || new Set();

			const attendedRecords = allAttendanceRecords.filter(
				(record) =>
					record.meetingId === meeting.id &&
					record.attended &&
					expectedUids.has(record.memberId), // Only count if they were expected
			);
			const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;
			return {
				meetingDisplay: formatMeetingDisplay(
					meeting.date,
					meeting.time,
					meeting.name,
					isDuplicateDate,
				),
				attendedCount: attendedRecords.length,
				expectedCount: expectedUids.size, // Use the size of the expected set
			};
		});
		return data;
	}, [meetingsForSeries, allAttendanceRecords, expectedAttendeesMap]);

	if (!meetingsForSeries || meetingsForSeries.length === 0) {
		return null;
	}

	const captionDateRangeText = formatDateRangeText(
		filterStartDate,
		filterEndDate,
	);

	return (
		<Card className="mb-6 shadow-md">
			<CardHeader>
				<CardTitle className="font-headline text-xl text-primary flex items-center">
					<BarChart3 className="mr-2 h-5 w-5" />{" "}
					{/* Icon can be LineChart from lucide-react */}
					Progresión de Asistencia: {seriesName}
				</CardTitle>
				{captionDateRangeText && (
					<CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
						<CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/80" />
						{captionDateRangeText}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent>
				{chartData.length > 0 ? (
					<ChartContainer config={chartConfig} className="h-[300px] w-full">
						<RechartsLineChart
							data={chartData}
							margin={{ top: 5, right: 20, left: -20, bottom: 40 }}
						>
							{" "}
							{/* Increased bottom margin for XAxis labels */}
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="meetingDisplay"
								tickLine={false}
								axisLine={false}
								tickMargin={10}
								angle={-30} // Angle labels to prevent overlap
								textAnchor="end"
								height={60} // Adjust height to accommodate angled labels
								interval={0} // Show all labels
								tick={{ fontSize: 10 }}
							/>
							<YAxis
								dataKey="attendedCount"
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								tickMargin={5}
								tick={{ fontSize: 10 }}
							/>
							<Tooltip
								cursor={true}
								content={<ChartTooltipContent indicator="line" />}
							/>
							<Line
								dataKey="attendedCount"
								type="linear"
								stroke="var(--color-attendedCount)"
								strokeWidth={2}
								dot={{
									fill: "var(--color-attendedCount)",
									r: 4,
								}}
								activeDot={{
									r: 6,
								}}
								name="Asistentes"
							/>
						</RechartsLineChart>
					</ChartContainer>
				) : (
					<p className="text-sm text-muted-foreground text-center py-4">
						No hay suficientes datos de asistencia para mostrar el gráfico para
						las instancias visibles.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
