"use client";

import {
	endOfMonth,
	format,
	isValid,
	isWithinInterval,
	parseISO,
	startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	AttendanceRecord,
	Meeting,
	MeetingSeries,
	Member,
} from "@/lib/types";
import AttendanceBreakdownChart from "./AttendanceBreakdownChart";

interface MonthlyAttendanceBreakdownCardProps {
	allMeetings: Meeting[];
	allAttendanceRecords: AttendanceRecord[];
	allMembers: Member[];
	allMeetingSeries: MeetingSeries[];
}

function getMonthOptions(
	meetings: Meeting[],
): { value: string; label: string }[] {
	if (!meetings || meetings.length === 0) {
		const now = new Date();
		const currentMonthValue = format(now, "yyyy-MM");
		const currentMonthLabel = format(now, "MMMM yyyy", { locale: es });
		return [{ value: currentMonthValue, label: currentMonthLabel }];
	}

	const monthSet = new Set<string>();
	meetings.forEach((meeting) => {
		if (meeting.date) {
			try {
				const parsedDate = parseISO(meeting.date);
				if (isValid(parsedDate)) {
					const monthYear = format(parsedDate, "yyyy-MM");
					monthSet.add(monthYear);
				}
			} catch (_e) {
				// Ignore invalid dates
			}
		}
	});

	const currentMonthValue = format(new Date(), "yyyy-MM");
	monthSet.add(currentMonthValue); // Ensure current month is always an option

	return Array.from(monthSet)
		.map((monthValue) => {
			const date = parseISO(`${monthValue}-01`); // Use first day of month for formatting
			return {
				value: monthValue,
				label: format(date, "MMMM yyyy", { locale: es }),
			};
		})
		.sort((a, b) => b.value.localeCompare(a.value)); // Sort descending (most recent first)
}

export default function MonthlyAttendanceBreakdownCard({
	allMeetings = [],
	allAttendanceRecords = [],
	allMembers = [],
	allMeetingSeries = [],
}: MonthlyAttendanceBreakdownCardProps) {
	const availableMonths = useMemo(
		() => getMonthOptions(allMeetings),
		[allMeetings],
	);

	const [selectedMonth, setSelectedMonth] = useState<string>(() => {
		return availableMonths.length > 0
			? availableMonths[0].value
			: format(new Date(), "yyyy-MM");
	});

	useEffect(() => {
		// Ensure selectedMonth is valid if availableMonths changes (e.g., data loads)
		if (
			availableMonths.length > 0 &&
			!availableMonths.find((m) => m.value === selectedMonth)
		) {
			setSelectedMonth(availableMonths[0].value);
		} else if (
			availableMonths.length === 0 &&
			selectedMonth !== format(new Date(), "yyyy-MM")
		) {
			setSelectedMonth(format(new Date(), "yyyy-MM"));
		}
	}, [availableMonths, selectedMonth]);

	const meetingsForSelectedPeriod = useMemo(() => {
		if (!selectedMonth) return [];
		const [year, month] = selectedMonth.split("-").map(Number);
		const startDate = startOfMonth(new Date(year, month - 1));
		const endDate = endOfMonth(new Date(year, month - 1));

		return allMeetings.filter((meeting) => {
			try {
				const meetingDate = parseISO(meeting.date);
				return (
					isValid(meetingDate) &&
					isWithinInterval(meetingDate, { start: startDate, end: endDate })
				);
			} catch (_e) {
				return false;
			}
		});
	}, [allMeetings, selectedMonth]);

	const selectedMonthLabel = useMemo(() => {
		return (
			availableMonths.find((m) => m.value === selectedMonth)?.label ||
			selectedMonth
		);
	}, [availableMonths, selectedMonth]);

	return (
		<Card className="lg:col-span-2">
			<CardHeader>
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
					<div className="flex-grow">
						<CardTitle className="flex items-center">
							<BarChart3 className="mr-2 h-5 w-5 text-primary" />
							Asistencia vs. Inasistencia
						</CardTitle>
						<CardDescription>
							Resumen de asistencia para el período seleccionado.
						</CardDescription>
					</div>
					<div className="w-full sm:w-auto sm:min-w-[180px]">
						<Select value={selectedMonth} onValueChange={setSelectedMonth}>
							<SelectTrigger className="h-9">
								<CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
								<SelectValue placeholder="Seleccionar mes..." />
							</SelectTrigger>
							<SelectContent>
								{availableMonths.map((month) => (
									<SelectItem key={month.value} value={month.value}>
										{month.label}
									</SelectItem>
								))}
								{availableMonths.length === 0 && (
									<SelectItem value={format(new Date(), "yyyy-MM")} disabled>
										{format(new Date(), "MMMM yyyy", { locale: es })} (Sin
										datos)
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<AttendanceBreakdownChart
					meetingsForPeriod={meetingsForSelectedPeriod}
					allAttendanceRecords={allAttendanceRecords}
					allMembers={allMembers}
					allMeetingSeries={allMeetingSeries}
					selectedPeriodLabel={selectedMonthLabel}
				/>
			</CardContent>
		</Card>
	);
}
