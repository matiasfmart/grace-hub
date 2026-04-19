"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Member, TitheRecord } from "@/lib/types";

interface TitheSummaryBarProps {
	allFilteredMembers: Member[];
	allTitheRecords: TitheRecord[];
	months: Date[];
}

export default function TitheSummaryCards({
	allFilteredMembers,
	allTitheRecords = [],
	months,
}: TitheSummaryBarProps) {
	const data = useMemo(() => {
		const total = allFilteredMembers.length;
		if (total === 0 || months.length === 0) return null;

		const memberIds = new Set(allFilteredMembers.map((m) => m.id));

		const getMonthStats = (monthDate: Date) => {
			const year = monthDate.getFullYear();
			const month = monthDate.getMonth() + 1;
			const tithers = new Set(
				allTitheRecords
					.filter((r) => r.year === year && r.month === month && memberIds.has(r.memberId))
					.map((r) => r.memberId),
			).size;
			return { tithers, rate: total > 0 ? Math.round((tithers / total) * 100) : 0 };
		};

		const lastMonth = months[months.length - 1];
		const { tithers, rate } = getMonthStats(lastMonth);

		let delta: number | null = null;
		let prevLabel: string | null = null;
		if (months.length >= 2) {
			const prevMonth = months[months.length - 2];
			const { rate: prevRate } = getMonthStats(prevMonth);
			delta = rate - prevRate;
			prevLabel = format(prevMonth, "MMM", { locale: es });
		}

		// Range KPIs — across all visible months
		const tithesByMember = new Map<string, Set<string>>();
		for (const id of memberIds) {
			tithesByMember.set(id, new Set());
		}
		for (const record of allTitheRecords) {
			if (!memberIds.has(record.memberId)) continue;
			const monthDate = months.find(
				(m) => m.getFullYear() === record.year && m.getMonth() + 1 === record.month,
			);
			if (monthDate) {
				tithesByMember.get(record.memberId)?.add(`${record.year}-${record.month}`);
			}
		}
		const rangeMonthCount = months.length;
		let alwaysTithed = 0;
		let neverTithed = 0;
		let totalMonthsTithed = 0;
		for (const [, monthsSet] of tithesByMember) {
			const count = monthsSet.size;
			totalMonthsTithed += count;
			if (count === rangeMonthCount) alwaysTithed++;
			if (count === 0) neverTithed++;
		}
		const avgMonths =
			total > 0 ? Math.round((totalMonthsTithed / total) * 10) / 10 : 0;

		return {
			monthLabel: format(lastMonth, "MMMM yyyy", { locale: es }),
			tithers,
			total,
			rate,
			delta,
			prevLabel,
			alwaysTithed,
			neverTithed,
			avgMonths,
			rangeMonthCount,
		};
	}, [allFilteredMembers, allTitheRecords, months]);

	if (!data) {
		return (
			<div className="rounded-lg border bg-card px-4 py-2.5 text-sm text-muted-foreground">
				Sin datos para el período seleccionado.
			</div>
		);
	}

	const { monthLabel, tithers, total, rate, delta, prevLabel, alwaysTithed, neverTithed, avgMonths, rangeMonthCount } = data;

	const rateColor =
		rate >= 70 ? "text-green-700 dark:text-green-400" : rate >= 50 ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400";
	const rateBorder =
		rate >= 70
			? "border-green-200 bg-green-50/50 dark:border-green-700/40 dark:bg-green-900/20"
			: rate >= 50
				? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-700/40 dark:bg-yellow-900/20"
				: "border-red-200 bg-red-50/50 dark:border-red-700/40 dark:bg-red-900/20";

	return (
		<div className="space-y-2">
			<div className={cn("rounded-lg border px-4 py-3 flex items-center gap-3 flex-wrap", rateBorder)}>
			<span className="text-sm text-muted-foreground capitalize font-medium">{monthLabel}</span>
			<span className="text-muted-foreground/50">—</span>
			<span className={cn("text-2xl font-bold tabular-nums leading-none", rateColor)}>{rate}%</span>
			<span className="text-sm text-muted-foreground">cumplimiento</span>
			<span className="text-sm font-semibold">
				({tithers}<span className="font-normal text-muted-foreground">/{total}</span>)
			</span>
			{delta !== null && prevLabel && (
				<span
					className={cn(
						"inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
						delta > 0
							? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
							: delta < 0
								? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
								: "bg-muted text-muted-foreground",
					)}
				>
					{delta > 0 ? (
						<TrendingUp className="h-3 w-3" />
					) : delta < 0 ? (
						<TrendingDown className="h-3 w-3" />
					) : (
						<Minus className="h-3 w-3" />
					)}
					{delta > 0 ? "+" : ""}
					{delta}% vs. {prevLabel}
				</span>
			)}
		</div>

		{/* Range KPIs */}
		<div className="grid grid-cols-3 gap-2">
			<div className="rounded-lg border bg-card px-3 py-2.5 text-center">
				<p className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400 leading-none mb-0.5">
					{alwaysTithed}
				</p>
				<p className="text-[11px] font-medium text-muted-foreground leading-tight">Siempre diezmaron</p>
				<p className="text-[10px] text-muted-foreground/60 leading-tight">en los {rangeMonthCount} meses</p>
			</div>
			<div className="rounded-lg border bg-card px-3 py-2.5 text-center">
				<p className="text-lg font-bold tabular-nums text-red-700 dark:text-red-400 leading-none mb-0.5">
					{neverTithed}
				</p>
				<p className="text-[11px] font-medium text-muted-foreground leading-tight">Nunca diezmaron</p>
				<p className="text-[10px] text-muted-foreground/60 leading-tight">en el período</p>
			</div>
			<div className="rounded-lg border bg-card px-3 py-2.5 text-center">
				<p className="text-lg font-bold tabular-nums text-primary leading-none mb-0.5">
					{avgMonths}
				</p>
				<p className="text-[11px] font-medium text-muted-foreground leading-tight">Promedio de meses</p>
				<p className="text-[10px] text-muted-foreground/60 leading-tight">por miembro</p>
			</div>
		</div>
		</div>
	);
}


