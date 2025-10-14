"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Percent, UserCheck, Users, UserX } from "lucide-react";
import { useMemo } from "react";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Member, TitheRecord } from "@/lib/types";

interface TitheSummaryCardsProps {
	filteredMembers: Member[];
	allTitheRecords: TitheRecord[];
	months: Date[];
}

export default function TitheSummaryCards({
	filteredMembers,
	allTitheRecords,
	months,
}: TitheSummaryCardsProps) {
	const summaryData = useMemo(() => {
		const totalFilteredMembers = filteredMembers.length;

		if (totalFilteredMembers === 0 || months.length === 0) {
			return {
				selectedMonthLabel: "N/A",
				totalFilteredMembers: 0,
				tithersThisMonth: 0,
				nonTithersThisMonth: 0,
				tithersPercentage: 0,
			};
		}

		// Calculate stats for the last month in the selected range
		const lastMonthDate = months[months.length - 1];
		const year = lastMonthDate.getFullYear();
		const monthNum = lastMonthDate.getMonth() + 1;
		const selectedMonthLabel = format(lastMonthDate, "MMMM yyyy", {
			locale: es,
		});

		const filteredMemberIds = new Set(filteredMembers.map((m) => m.id));

		const tithersThisMonthIds = new Set<string>();
		allTitheRecords.forEach((record) => {
			if (
				record.year === year &&
				record.month === monthNum &&
				filteredMemberIds.has(record.memberId)
			) {
				tithersThisMonthIds.add(record.memberId);
			}
		});

		const tithersThisMonth = tithersThisMonthIds.size;
		const nonTithersThisMonth = totalFilteredMembers - tithersThisMonth;

		const tithersPercentage =
			totalFilteredMembers > 0
				? (tithersThisMonth / totalFilteredMembers) * 100
				: 0;

		return {
			selectedMonthLabel,
			totalFilteredMembers,
			tithersThisMonth,
			nonTithersThisMonth,
			tithersPercentage,
		};
	}, [filteredMembers, allTitheRecords, months]);

	return (
		<div className="mb-6">
			<h3 className="text-lg font-semibold flex items-center mb-2">
				<Calendar className="mr-2 h-5 w-5 text-primary" />
				Resumen para:{" "}
				<span className="capitalize ml-1 font-bold">
					{summaryData.selectedMonthLabel}
				</span>
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-medium flex items-center">
							<Users className="mr-2 h-4 w-4" />
							Miembros (Filtrados)
						</CardDescription>
						<CardTitle className="text-3xl">
							{summaryData.totalFilteredMembers}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-medium flex items-center">
							<UserCheck className="mr-2 h-4 w-4 text-green-600" />
							Diezmaron
						</CardDescription>
						<CardTitle className="text-3xl text-green-700">
							{summaryData.tithersThisMonth}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-medium flex items-center">
							<UserX className="mr-2 h-4 w-4 text-red-600" />
							No Registrado
						</CardDescription>
						<CardTitle className="text-3xl text-red-700">
							{summaryData.nonTithersThisMonth}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-medium flex items-center">
							<Percent className="mr-2 h-4 w-4 text-primary" />% que Diezmó
						</CardDescription>
						<CardTitle className="text-3xl">
							{summaryData.tithersPercentage.toFixed(0)}%
						</CardTitle>
					</CardHeader>
				</Card>
			</div>
		</div>
	);
}
