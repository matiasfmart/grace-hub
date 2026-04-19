"use client";

import { BarChart2 } from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthlyAttendanceSummary } from "@/lib/utils/attendance";

interface MemberAttendanceBarChartProps {
	monthlyData: MonthlyAttendanceSummary[];
}

const chartConfig = {
	attended: {
		label: "Presente",
		color: "hsl(142 71% 45%)",
	},
	absent: {
		label: "Ausente",
		color: "hsl(0 72% 51%)",
	},
} satisfies ChartConfig;

export default function MemberAttendanceLineChart({
	monthlyData,
}: MemberAttendanceBarChartProps) {
	if (monthlyData.length === 0) {
		return (
			<Card className="shadow-none border">
				<CardContent className="flex items-center justify-center py-10 text-sm text-muted-foreground">
					No hay datos de asistencia para el período seleccionado.
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="shadow-none border">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium flex items-center gap-2">
					<BarChart2 className="h-4 w-4 text-primary" />
					Asistencia por mes
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[200px] w-full">
					<BarChart
						data={monthlyData}
						margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
					>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							dataKey="monthDisplay"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							angle={-35}
							textAnchor="end"
							height={60}
							interval="preserveStartEnd"
							tick={{ fontSize: 10 }}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
							tick={{ fontSize: 10 }}
						/>
						<Tooltip
							content={({ active, payload, label }) => {
								if (!active || !payload?.length) return null;
								const attended = (payload.find((p) => p.dataKey === "attended")?.value as number) ?? 0;
								const absent = (payload.find((p) => p.dataKey === "absent")?.value as number) ?? 0;
								const rate = attended + absent > 0
									? Math.round((attended / (attended + absent)) * 100)
									: 0;
								return (
									<ChartTooltipContent
										className="w-[180px]"
										label={label}
										payload={[
											{ name: "Presente", value: attended, color: "hsl(142 71% 45%)" },
											{ name: "Ausente", value: absent, color: "hsl(0 72% 51%)" },
											{ name: "Tasa", value: `${rate}%`, color: "hsl(var(--primary))" },
										]}
									/>
								);
							}}
						/>
						<Legend
							verticalAlign="top"
							height={24}
							iconSize={10}
							wrapperStyle={{ fontSize: "11px" }}
						/>
						<Bar dataKey="attended" name="Presente" stackId="a" fill="hsl(142 71% 45%)" radius={[0, 0, 0, 0]} />
						<Bar dataKey="absent" name="Ausente" stackId="a" fill="hsl(0 72% 51%)" radius={[2, 2, 0, 0]} />
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
