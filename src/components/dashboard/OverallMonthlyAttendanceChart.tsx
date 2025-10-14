"use client";

import {
	eachDayOfInterval,
	endOfDay,
	endOfMonth,
	format,
	isValid,
	parseISO,
	startOfDay,
	startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRange, TrendingUp } from "lucide-react";
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

interface OverallAttendanceChartProps {
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
}

interface DailyAttendanceDataPoint {
	date: string; // YYYY-MM-DD
	displayDate: string; // Formatted for X-axis
	attendedCount: number;
}

const chartConfig = {
	attendedCount: {
		label: "Asistentes",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig;

export default function OverallMonthlyAttendanceChart({
	allMeetings,
	allAttendanceRecords,
}: OverallAttendanceChartProps) {
	const [startDate, setStartDate] = useState<Date | undefined>(undefined); // Initialize as undefined
	const [endDate, setEndDate] = useState<Date | undefined>(undefined); // Initialize as undefined

	useEffect(() => {
		// Set initial dates on client-side after mount
		setStartDate(startOfMonth(new Date()));
		setEndDate(endOfMonth(new Date()));
	}, []); // Empty dependency array ensures this runs once on mount

	const meetingsForPeriod = useMemo(() => {
		if (!allMeetings || !startDate || !endDate) return []; // Guard against undefined dates
		return allMeetings.filter((meeting) => {
			const meetingDateObj = parseISO(meeting.date);
			if (!isValid(meetingDateObj)) return false;

			const isAfterOrOnStartDate = meetingDateObj >= startOfDay(startDate);
			const isBeforeOrOnEndDate = meetingDateObj <= endOfDay(endDate);

			return isAfterOrOnStartDate && isBeforeOrOnEndDate;
		});
	}, [allMeetings, startDate, endDate]);

	const chartData = useMemo(() => {
		let effectiveStartDate = startDate;
		let effectiveEndDate = endDate;

		if (
			!effectiveStartDate ||
			!effectiveEndDate ||
			effectiveStartDate > effectiveEndDate
		) {
			// If filters are not yet set by useEffect or are invalid, try to derive range from meetingsForPeriod (which might be empty)
			const validMeetingsInCurrentPeriod = meetingsForPeriod.filter((m) =>
				isValid(parseISO(m.date)),
			);
			if (validMeetingsInCurrentPeriod.length === 0) return [];

			effectiveStartDate = parseISO(
				validMeetingsInCurrentPeriod.reduce(
					(earliest, m) =>
						parseISO(m.date) < parseISO(earliest.date) ? m : earliest,
					validMeetingsInCurrentPeriod[0],
				).date,
			);
			effectiveEndDate = parseISO(
				validMeetingsInCurrentPeriod.reduce(
					(latest, m) =>
						parseISO(m.date) > parseISO(latest.date) ? m : latest,
					validMeetingsInCurrentPeriod[0],
				).date,
			);

			if (
				!isValid(effectiveStartDate) ||
				!isValid(effectiveEndDate) ||
				effectiveStartDate > effectiveEndDate
			)
				return [];
		}

		const dateInterval = eachDayOfInterval({
			start: startOfDay(effectiveStartDate),
			end: startOfDay(effectiveEndDate),
		});

		const data: DailyAttendanceDataPoint[] = dateInterval.map((day) => {
			const formattedDay = format(day, "yyyy-MM-dd");
			const meetingsOnThisDay = meetingsForPeriod.filter(
				(m) => m.date === formattedDay,
			);
			let dailyAttendedCount = 0;

			meetingsOnThisDay.forEach((meeting) => {
				dailyAttendedCount += allAttendanceRecords.filter(
					(r) => r.meetingId === meeting.id && r.attended,
				).length;
			});

			return {
				date: formattedDay,
				displayDate: format(day, "d MMM", { locale: es }),
				attendedCount: dailyAttendedCount,
			};
		});
		return data;
	}, [meetingsForPeriod, allAttendanceRecords, startDate, endDate]);

	const cardDescription = useMemo(() => {
		if (startDate && endDate) {
			return `Tendencia de asistencia general del ${format(startDate, "dd MMM yyyy", { locale: es })} al ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
		} else if (startDate) {
			return `Tendencia de asistencia general desde el ${format(startDate, "dd MMM yyyy", { locale: es })}.`;
		} else if (endDate) {
			return `Tendencia de asistencia general hasta el ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
		}
		return "Tendencia de asistencia a todas las reuniones generales.";
	}, [startDate, endDate]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center">
					<TrendingUp className="mr-2 h-5 w-5 text-primary" />
					Tendencia de Asistencia General
				</CardTitle>
				<CardDescription className="flex items-center text-xs pt-1">
					<CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/70" />
					{cardDescription}
				</CardDescription>
				<div className="pt-3">
					<div className="flex flex-col sm:flex-row gap-2 items-end">
						<div className="flex-grow w-full sm:w-auto">
							<label
								htmlFor="trendStartDateFilter"
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
								htmlFor="trendEndDateFilter"
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
							margin={{ top: 5, right: 20, left: -10, bottom: 40 }}
						>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="displayDate"
								tickLine={false}
								axisLine={false}
								tickMargin={10}
								angle={-30}
								textAnchor="end"
								height={60}
								interval="preserveStartEnd"
								tick={{ fontSize: 10 }}
							/>
							<YAxis
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								tickMargin={5}
								tick={{ fontSize: 10 }}
								label={{
									value: "Total Asistentes/Día",
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
								content={<ChartTooltipContent indicator="line" />}
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
							/>
						</RechartsLineChart>
					</ChartContainer>
				) : (
					<div className="flex items-center justify-center h-64">
						<p className="text-muted-foreground">
							No hay datos de asistencia para el período seleccionado.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
