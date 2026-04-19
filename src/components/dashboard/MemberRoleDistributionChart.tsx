"use client";

import { useMemo } from "react";
import {
	Cell,
	Legend,
	Pie,
	PieChart as RechartsPieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import type { Member } from "@/lib/types";

interface MemberRoleDistributionChartProps {
	allMembers: Member[];
}

interface RoleDataPoint {
	name: string;
	value: number;
}

const COLORS = {
	Líderes: "hsl(var(--chart-1))", // Guías GDI + Líderes Área
	Mentores: "hsl(var(--chart-4))", // Mentores GDI + Mentores Área
	Obreros: "hsl(var(--chart-2))", // Obreros
	"Sin Rol": "hsl(var(--chart-3))", // Miembros sin rol asignado
};

export default function MemberRoleDistributionChart({
	allMembers,
}: MemberRoleDistributionChartProps) {
	const chartData = useMemo(() => {
		// Count members by role category
		// A member can have multiple roles, so we categorize by highest priority:
		// Leader (GdiGuide/AreaLeader) > Mentor (GdiMentor/AreaMentor) > Worker > No Role
		
		const leaderRoles = ["GdiGuide", "AreaLeader"];
		const mentorRoles = ["GdiMentor", "AreaMentor"];
		
		let leaderCount = 0;
		let mentorCount = 0;
		let workerCount = 0;
		let noRoleCount = 0;

		allMembers.forEach((member) => {
			const roles = member.roles || [];
			
			if (roles.some(r => leaderRoles.includes(r))) {
				leaderCount++;
			} else if (roles.some(r => mentorRoles.includes(r))) {
				mentorCount++;
			} else if (roles.includes("Worker")) {
				workerCount++;
			} else {
				noRoleCount++;
			}
		});

		const data: RoleDataPoint[] = [];
		if (leaderCount > 0)
			data.push({ name: "Líderes", value: leaderCount });
		if (mentorCount > 0)
			data.push({ name: "Mentores", value: mentorCount });
		if (workerCount > 0)
			data.push({ name: "Obreros", value: workerCount });
		if (noRoleCount > 0)
			data.push({ name: "Sin Rol", value: noRoleCount });

		return data;
	}, [allMembers]);

	if (chartData.length === 0 || allMembers.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<p className="text-muted-foreground">
					No hay datos de miembros para mostrar distribución.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full flex flex-col items-center">
			<div className="mb-2 text-sm text-muted-foreground font-medium">
				Total miembros:{" "}
				<span className="font-bold text-primary">{allMembers.length}</span>
			</div>
			<ResponsiveContainer width="100%" height={300}>
				<RechartsPieChart>
					<Pie
						data={chartData}
						cx="50%"
						cy="50%"
						labelLine={false}
						outerRadius={80}
						fill="#8884d8"
						dataKey="value"
						label={({ name, percent }) =>
							`${name} (${(percent * 100).toFixed(0)}%)`
						}
					>
						{chartData.map((entry, index) => (
							<Cell
								key={`cell-${index}`}
								fill={COLORS[entry.name as keyof typeof COLORS] || "#82ca9d"}
							/>
						))}
					</Pie>
					<Tooltip
						formatter={(value: number, name: string) => [
							`${value} miembro(s)`,
							name,
						]}
					/>
					<Legend />
				</RechartsPieChart>
			</ResponsiveContainer>
		</div>
	);
}
