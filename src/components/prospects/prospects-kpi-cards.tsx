"use client";

import type { Prospect } from "@/lib/types";

interface ProspectsKpiCardsProps {
	pendingProspects: Prospect[];
	integratedProspects: Prospect[] | null;
}

function countIntegratedThisMonth(prospects: Prospect[]): number {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1; // 1-based
	return prospects.filter((p) => {
		const [year, month] = p.visitDate.split("-").map(Number);
		return year === currentYear && month === currentMonth;
	}).length;
}

export default function ProspectsKpiCards({
	pendingProspects,
	integratedProspects,
}: ProspectsKpiCardsProps) {
	const pendingCount = pendingProspects.length;
	const integratedThisMonth =
		integratedProspects !== null ? countIntegratedThisMonth(integratedProspects) : null;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
			<div className="rounded-lg border bg-card p-4">
				<p className="text-sm text-muted-foreground">Visitantes pendientes</p>
				<p className="text-2xl font-bold mt-1">{pendingCount}</p>
				<p className="text-xs text-muted-foreground mt-1">
					Esperando integración o archivo
				</p>
			</div>
			<div className="rounded-lg border bg-card p-4">
				<p className="text-sm text-muted-foreground">Integrados este mes</p>
				<p className="text-2xl font-bold mt-1">
					{integratedThisMonth !== null ? integratedThisMonth : (
						<span className="text-muted-foreground text-base font-normal">—</span>
					)}
				</p>
				<p className="text-xs text-muted-foreground mt-1">
					{integratedThisMonth !== null
						? "Visitantes convertidos a miembros en el mes actual"
						: "Abrí el tab \"Integrados\" para ver el conteo del mes"}
				</p>
			</div>
		</div>
	);
}

