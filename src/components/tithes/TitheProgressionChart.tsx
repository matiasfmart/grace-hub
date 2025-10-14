"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRange, LineChart as LineChartIcon } from "lucide-react";
import { useMemo } from "react";
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
import type { Member, TitheRecord } from "@/lib/types";

interface TitheProgressionChartProps {
	filteredMembers: Member[];
	allTitheRecords: TitheRecord[];
	months: Date[];
}

interface MonthlyChartDataPoint {
	monthDisplay: string;
	tithersCount: number;
}

const chartConfig = {
	tithersCount: {
		label: "Miembros que Diezmaron",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig;

export default function TitheProgressionChart({
	filteredMembers,
	allTitheRecords,
	months,
}: TitheProgressionChartProps) {
	const chartData = useMemo(() => {
		if (
			!months ||
			months.length === 0 ||
			!filteredMembers ||
			filteredMembers.length === 0
		) {
			return [];
		}

		const memberIds = new Set(filteredMembers.map((m) => m.id));

		return months.map((monthDate) => {
			const year = monthDate.getFullYear();
			const monthNum = monthDate.getMonth() + 1;

			const tithersInMonth = new Set<string>();

			allTitheRecords.forEach((record) => {
				if (
					record.year === year &&
					record.month === monthNum &&
					memberIds.has(record.memberId)
				) {
					tithersInMonth.add(record.memberId);
				}
			});

			return {
				monthDisplay: format(monthDate, "MMM yyyy", { locale: es }),
				tithersCount: tithersInMonth.size,
			};
		});
	}, [months, filteredMembers, allTitheRecords]);

	const cardDescription = useMemo(() => {
		if (months.length > 0) {
			const start = format(months[0], "MMMM yyyy", { locale: es });
			const end = format(months[months.length - 1], "MMMM yyyy", {
				locale: es,
			});
			return `Progresión de diezmos para los miembros filtrados desde ${start} hasta ${end}.`;
		}
		return "Progresión de diezmos para los miembros filtrados.";
	}, [months]);

	return (
		<Card className="shadow-sm mb-6">
			<CardHeader>
				<CardTitle className="font-headline text-lg text-primary flex items-center">
					<LineChartIcon className="mr-2 h-5 w-5" />
					Progresión Mensual de Diezmos
				</CardTitle>
				<CardDescription className="text-xs text-muted-foreground pt-1 flex items-center">
					<CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/80" />{" "}
					{cardDescription}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{chartData.length > 0 ? (
					<ChartContainer config={chartConfig} className="h-[250px] w-full">
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
								dataKey="tithersCount"
								domain={[0, () => Math.max(10, filteredMembers.length)]}
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								tickMargin={5}
								tick={{ fontSize: 10 }}
								label={{
									value: "N° de Miembros",
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
								dataKey="tithersCount"
								type="linear"
								stroke="var(--color-tithersCount)"
								strokeWidth={2}
								dot={{
									fill: "var(--color-tithersCount)",
									r: 3,
								}}
								activeDot={{
									r: 5,
								}}
								name="Miembros"
							/>
						</RechartsLineChart>
					</ChartContainer>
				) : (
					<p className="text-sm text-muted-foreground text-center py-8">
						No hay suficientes datos para mostrar el gráfico con los filtros
						actuales.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
