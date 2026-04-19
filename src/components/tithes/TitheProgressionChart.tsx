"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRange, LineChart as LineChartIcon } from "lucide-react";
import { useMemo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart as RechartsLineChart,
	ReferenceLine,
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
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import type { Member, TitheRecord } from "@/lib/types";

interface TitheProgressionChartProps {
	allFilteredMembers: Member[];
	allTitheRecords: TitheRecord[];
	months: Date[];
}

const chartConfig = {
	rate: {
		label: "% Cumplimiento",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig;

export default function TitheProgressionChart({
	allFilteredMembers,
	allTitheRecords = [],
	months,
}: TitheProgressionChartProps) {
	const { chartData, avgRate } = useMemo(() => {
		if (!months || months.length === 0 || allFilteredMembers.length === 0) {
			return { chartData: [], avgRate: 0 };
		}

		const total = allFilteredMembers.length;
		const memberIds = new Set(allFilteredMembers.map((m) => m.id));

		const data = months.map((monthDate) => {
			const year = monthDate.getFullYear();
			const monthNum = monthDate.getMonth() + 1;
			const tithers = new Set(
				allTitheRecords
					.filter((r) => r.year === year && r.month === monthNum && memberIds.has(r.memberId))
					.map((r) => r.memberId),
			).size;
			const rate = total > 0 ? Math.round((tithers / total) * 100) : 0;
			return {
				monthDisplay: format(monthDate, "MMM yyyy", { locale: es }),
				rate,
				tithers,
				total,
			};
		});

		const avg =
			data.length > 0
				? Math.round(data.reduce((s, d) => s + d.rate, 0) / data.length)
				: 0;

		return { chartData: data, avgRate: avg };
	}, [months, allFilteredMembers, allTitheRecords]);

	const cardDescription = useMemo(() => {
		if (months.length === 0) return "Selecciona un rango de fechas.";
		const start = format(months[0], "MMM yyyy", { locale: es });
		const end = format(months[months.length - 1], "MMM yyyy", { locale: es });
		const range = months.length === 1 ? start : `${start} – ${end}`;
		return `${range} · ${allFilteredMembers.length} miembro(s) filtrado(s)`;
	}, [months, allFilteredMembers.length]);

	return (
		<Card className="shadow-sm">
			<CardHeader className="pb-2">
				<CardTitle className="font-headline text-lg text-primary flex items-center">
					<LineChartIcon className="mr-2 h-5 w-5" />
					Progresión Mensual de Diezmos
				</CardTitle>
				<CardDescription className="text-xs text-muted-foreground pt-1 flex items-center">
					<CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/80" />
					{cardDescription}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{chartData.length > 1 ? (
					<ChartContainer config={chartConfig} className="h-[220px] w-full">
						<RechartsLineChart
							data={chartData}
							margin={{ top: 5, right: 20, left: -5, bottom: 50 }}
						>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="monthDisplay"
								tickLine={false}
								axisLine={false}
								tickMargin={10}
								angle={-40}
								textAnchor="end"
								height={70}
								interval="preserveStartEnd"
								tick={{ fontSize: 9 }}
							/>
							<YAxis
								domain={[0, 100]}
								tickLine={false}
								axisLine={false}
								tickMargin={5}
								tick={{ fontSize: 10 }}
								tickFormatter={(v) => `${v}%`}
							/>
							<Tooltip
								cursor
								content={({ active, payload }) => {
									if (active && payload?.length) {
										const d = payload[0].payload;
										return (
											<div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md space-y-0.5">
												<p className="font-medium capitalize">{d.monthDisplay}</p>
												<p className="text-primary font-bold">{d.rate}% cumplimiento</p>
												<p className="text-muted-foreground">{d.tithers}/{d.total} diezmaron</p>
											</div>
										);
									}
									return null;
								}}
							/>
							<ReferenceLine
								y={avgRate}
								stroke="hsl(var(--muted-foreground))"
								strokeDasharray="4 4"
								strokeOpacity={0.5}
								label={{
									value: `Prom. ${avgRate}%`,
									position: "insideTopRight",
									fontSize: 9,
									fill: "hsl(var(--muted-foreground))",
								}}
							/>
							<Line
								dataKey="rate"
								type="monotone"
								stroke="var(--color-rate)"
								strokeWidth={2}
								dot={{ fill: "var(--color-rate)", r: 3 }}
								activeDot={{ r: 5 }}
								name="% Cumplimiento"
								connectNulls
							/>
						</RechartsLineChart>
					</ChartContainer>
				) : chartData.length === 1 ? (
					<p className="text-sm text-muted-foreground text-center py-8">
						Selecciona más de un mes para ver la progresión.
					</p>
				) : (
					<p className="text-sm text-muted-foreground text-center py-8">
						No hay suficientes datos para mostrar el gráfico con los filtros actuales.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

