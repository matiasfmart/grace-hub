"use client";

import {
	eachMonthOfInterval,
	endOfMonth,
	format,
	isFuture,
	isValid,
	startOfYear,
} from "date-fns";
import { es } from "date-fns/locale";
import { Award, Flame, History } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TitheRecord } from "@/lib/types";

interface MemberTitheHistoryProps {
	memberId: string;
	allTitheRecords: TitheRecord[];
	startDate?: Date;
	endDate?: Date;
}

export default function MemberTitheHistory({
	memberId,
	allTitheRecords,
	startDate,
	endDate,
}: MemberTitheHistoryProps) {
	const effectiveDateRange = useMemo(() => {
		if (
			startDate &&
			endDate &&
			isValid(startDate) &&
			isValid(endDate) &&
			startDate <= endDate
		) {
			return { start: startDate, end: endDate };
		}
		const now = new Date();
		return { start: startOfYear(now), end: endOfMonth(now) };
	}, [startDate, endDate]);

	// ── Range-based stats ────────────────────────────────────────────────────
	const { monthlyStatuses, tithedCount, totalCount, missedMonths } = useMemo(() => {
		const { start, end } = effectiveDateRange;
		const allMonthsInRange = eachMonthOfInterval({ start, end });

		const memberTitheSet = new Set(
			(allTitheRecords ?? [])
				.filter((r) => r.memberId === memberId)
				.map((r) => `${r.year}-${r.month}`),
		);

		const statuses = allMonthsInRange.map((monthDate) => {
			const year = monthDate.getFullYear();
			const monthNum = monthDate.getMonth() + 1;
			const key = `${year}-${monthNum}`;
			const future = isFuture(endOfMonth(monthDate));
			const tithed = memberTitheSet.has(key);
			return { date: monthDate, tithed, future };
		});

		const pastMonths = statuses.filter((m) => !m.future);
		const tithedCount = pastMonths.filter((m) => m.tithed).length;
		const totalCount = pastMonths.length;
		const missedMonths = pastMonths
			.filter((m) => !m.tithed)
			.map((m) => format(m.date, "MMM yyyy", { locale: es }));

		return { monthlyStatuses: statuses, tithedCount, totalCount, missedMonths };
	}, [effectiveDateRange, allTitheRecords, memberId]);

	// ── Historical KPIs (all records, no range filter) ───────────────────────
	const { rachaActual, mejorRacha, totalHistorico } = useMemo(() => {
		const memberRecords = (allTitheRecords ?? []).filter(
			(r) => r.memberId === memberId,
		);

		if (memberRecords.length === 0) {
			return { rachaActual: 0, mejorRacha: 0, totalHistorico: null };
		}

		const sorted = [...memberRecords].sort((a, b) =>
			a.year !== b.year ? a.year - b.year : a.month - b.month,
		);
		const titheSet = new Set(sorted.map((r) => `${r.year}-${r.month}`));

		// Total histórico: desde primer registro hasta hoy
		const firstRecord = sorted[0];
		const firstDate = new Date(firstRecord.year, firstRecord.month - 1, 1);
		const today = new Date();
		const allMonthsSinceFirst = eachMonthOfInterval({ start: firstDate, end: today });
		const pastMonthsSinceFirst = allMonthsSinceFirst.filter((d) => !isFuture(endOfMonth(d)));
		const historicoNum = pastMonthsSinceFirst.filter((d) =>
			titheSet.has(`${d.getFullYear()}-${d.getMonth() + 1}`),
		).length;
		const historicoDen = pastMonthsSinceFirst.length;

		// Racha actual: meses consecutivos hacia atrás desde hoy
		let rachaActual = 0;
		let year = today.getFullYear();
		let month = today.getMonth() + 1;
		let skippedCurrent = false;
		const safetyFloor = firstRecord.year - 1;

		while (year > safetyFloor) {
			const key = `${year}-${month}`;
			if (titheSet.has(key)) {
				rachaActual++;
			} else {
				const isCurrentMonth =
					year === today.getFullYear() && month === today.getMonth() + 1;
				if (!skippedCurrent && isCurrentMonth) {
					skippedCurrent = true;
				} else {
					break;
				}
			}
			month--;
			if (month === 0) { month = 12; year--; }
		}

		// Mejor racha: racha más larga histórica
		let mejorRacha = 0;
		let currentStreak = 0;
		let prevYear: number | null = null;
		let prevMonth: number | null = null;

		for (const record of sorted) {
			if (prevYear === null || prevMonth === null) {
				currentStreak = 1;
			} else {
				const expYear = prevMonth === 12 ? prevYear + 1 : prevYear;
				const expMonth = prevMonth === 12 ? 1 : prevMonth + 1;
				currentStreak = record.year === expYear && record.month === expMonth
					? currentStreak + 1
					: 1;
			}
			mejorRacha = Math.max(mejorRacha, currentStreak);
			prevYear = record.year;
			prevMonth = record.month;
		}

		return {
			rachaActual,
			mejorRacha,
			totalHistorico: historicoDen > 0
				? { months: historicoNum, total: historicoDen }
				: null,
		};
	}, [allTitheRecords, memberId]);

	// ── Derived display ──────────────────────────────────────────────────────
	const percentage = totalCount > 0 ? Math.round((tithedCount / totalCount) * 100) : 0;

	const progressColor =
		percentage >= 75 ? "bg-green-500 dark:bg-green-400"
		: percentage >= 50 ? "bg-yellow-500 dark:bg-yellow-400"
		: "bg-red-500 dark:bg-red-400";

	const percentageText =
		percentage >= 75 ? "text-green-700 dark:text-green-400"
		: percentage >= 50 ? "text-yellow-700 dark:text-yellow-400"
		: "text-red-700 dark:text-red-400";

	const historicoPercentage =
		totalHistorico && totalHistorico.total > 0
			? Math.round((totalHistorico.months / totalHistorico.total) * 100)
			: null;

	const historicoColor =
		historicoPercentage === null ? "text-muted-foreground"
		: historicoPercentage >= 75 ? "text-green-700 dark:text-green-400"
		: historicoPercentage >= 50 ? "text-yellow-700 dark:text-yellow-400"
		: "text-red-700 dark:text-red-400";

	// Group months by year for the grid (to show year separators on multi-year ranges)
	const monthsByYear = useMemo(() => {
		const groups = new Map<number, typeof monthlyStatuses>();
		for (const m of monthlyStatuses) {
			const y = m.date.getFullYear();
			if (!groups.has(y)) groups.set(y, []);
			groups.get(y)!.push(m);
		}
		return [...groups.entries()];
	}, [monthlyStatuses]);

	const isMultiYear = monthsByYear.length > 1;

	return (
		<div className="space-y-5">

			{/* ── Sección histórica ─────────────────────────────────── */}
			<div>
				<div className="flex items-center gap-1.5 mb-2.5">
					<History className="h-3.5 w-3.5 text-muted-foreground" />
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Resumen histórico
					</span>
					<span className="ml-auto text-[10px] text-muted-foreground/50 italic">
						no cambia con el filtro
					</span>
				</div>
				<div className="grid grid-cols-3 gap-2">
					{/* Racha actual */}
				<div className="rounded-lg border border-border bg-card shadow-sm p-3 text-center space-y-0.5">
						<Flame className="h-3.5 w-3.5 mx-auto text-orange-500 dark:text-orange-400 mb-1" />
						<p className="text-xl font-bold tabular-nums text-orange-600 dark:text-orange-400 leading-none">
							{rachaActual}
						</p>
						<p className="text-[10px] font-medium text-foreground leading-tight">Racha actual</p>
						<p className="text-[9px] text-muted-foreground/60 leading-tight">meses consec.</p>
					</div>
					{/* Mejor racha */}
				<div className="rounded-lg border border-border bg-card shadow-sm p-3 text-center space-y-0.5">
						<Award className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
						<p className="text-xl font-bold tabular-nums text-primary leading-none">
							{mejorRacha}
						</p>
						<p className="text-[10px] font-medium text-foreground leading-tight">Mejor racha</p>
						<p className="text-[9px] text-muted-foreground/60 leading-tight">histórica</p>
					</div>
					{/* Total histórico */}
				<div className="rounded-lg border border-border bg-card shadow-sm p-3 text-center space-y-0.5">
						<History className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
						{totalHistorico ? (
							<>
								<p className={cn("text-xl font-bold tabular-nums leading-none", historicoColor)}>
									{historicoPercentage}%
								</p>
								<p className="text-[10px] font-medium text-foreground leading-tight">Total histórico</p>
								<p className="text-[9px] text-muted-foreground/60 leading-tight">
									{totalHistorico.months}/{totalHistorico.total} meses
								</p>
							</>
						) : (
							<>
								<p className="text-xl font-bold tabular-nums text-muted-foreground leading-none">—</p>
								<p className="text-[10px] font-medium text-foreground leading-tight">Total histórico</p>
								<p className="text-[9px] text-muted-foreground/60 leading-tight">sin registros</p>
							</>
						)}
					</div>
				</div>
			</div>

			{/* ── Separador ─────────────────────────────────────────── */}
			<div className="border-t border-dashed border-border" />

			{/* ── Sección del período ───────────────────────────────── */}
			<div className="space-y-4 rounded-lg border-t-2 border-t-primary border border-border bg-card shadow-sm p-3">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Período seleccionado
					</span>
				</div>

				{/* Barra de progreso */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-sm">
						<span className="text-xs text-muted-foreground">
							{tithedCount} de {totalCount} meses
						</span>
						<span className={cn("text-sm font-bold tabular-nums", percentageText)}>
							{percentage}%
						</span>
					</div>
					<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
						<div
							className={cn("h-full rounded-full transition-all duration-500", progressColor)}
							style={{ width: `${percentage}%` }}
						/>
					</div>
				</div>

				{/* Grilla de meses — con separadores de año si el rango es multi-año */}
				<div className="space-y-3">
					{monthsByYear.map(([year, months]) => (
						<div key={year}>
							{isMultiYear && (
								<p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 tracking-wider">
									{year}
								</p>
							)}
							<div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
								{months.map(({ date, tithed, future }) => {
									const label = format(date, "MMM", { locale: es });
									return (
										<div
											key={date.toISOString()}
											title={format(date, "MMMM yyyy", { locale: es })}
											className={cn(
												"flex flex-col items-center gap-0.5 rounded-md py-1.5 px-1 text-center select-none",
												future
													? "border border-dashed border-border/60 text-muted-foreground/30"
													: tithed
														? "bg-green-500/10 dark:bg-green-900/30 text-green-700 dark:text-green-400"
														: "bg-red-500/10 dark:bg-red-900/30 text-red-600 dark:text-red-400",
											)}
										>
											<span className="text-[10px] font-semibold uppercase leading-none capitalize">
												{label}
											</span>
											<span className="text-[11px] leading-none mt-0.5">
												{future ? "·" : tithed ? "✓" : "×"}
											</span>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>

				{/* Meses sin registro */}
				{missedMonths.length > 0 && (
					<div className="rounded-md bg-red-500/8 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/40 px-3 py-2">
						<p className="text-[10px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">
							Sin registro
						</p>
						<p className="text-xs text-foreground capitalize">
							{missedMonths.join(" · ")}
						</p>
					</div>
				)}

				{missedMonths.length === 0 && totalCount > 0 && (
					<div className="rounded-md bg-green-500/8 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/40 px-3 py-2 text-center">
						<p className="text-xs font-medium text-green-700 dark:text-green-400">
							✓ Todos los meses del período registrados
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
