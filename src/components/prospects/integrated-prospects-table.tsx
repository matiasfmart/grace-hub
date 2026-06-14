"use client";

import { useMemo } from "react";
import { Eye, UserCheck } from "lucide-react";
import type { Prospect } from "@/lib/types";
import { formatProspectVisitDate } from "@/lib/utils/date";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface IntegratedProspectsTableProps {
	prospects: Prospect[];
	onView: (prospect: Prospect) => void;
}

export default function IntegratedProspectsTable({ prospects, onView }: IntegratedProspectsTableProps) {
	const sorted = useMemo(
		() => [...prospects].sort((a, b) => b.visitDate.localeCompare(a.visitDate)),
		[prospects],
	);

	if (sorted.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground rounded-lg border">
				<UserCheck className="h-12 w-12 mb-4 opacity-30" />
				<p className="text-lg font-medium">No hay visitantes integrados</p>
				<p className="text-sm mt-1">Los visitantes integrados como miembros aparecerán aquí.</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/20">
						<TableHead>Visitante</TableHead>
						<TableHead>Teléfono</TableHead>
						<TableHead>Fecha de visita</TableHead>
						<TableHead>Agregado por</TableHead>
						<TableHead>Fuente</TableHead>
						<TableHead>Miembro</TableHead>
						<TableHead className="w-[52px]">
							<span className="sr-only">Acciones</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map((prospect) => (
						<TableRow key={prospect.id} className="opacity-90">
							{/* Visitante */}
							<TableCell>
								<div className="flex items-center gap-3">
									<Avatar className="h-8 w-8">
										<AvatarFallback className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
											{prospect.firstName.substring(0, 1)}
											{prospect.lastName.substring(0, 1)}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className="font-medium text-sm">
											{prospect.firstName} {prospect.lastName}
										</p>
										{prospect.notes && (
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<p className="text-xs text-muted-foreground truncate max-w-[180px] cursor-default">
															{prospect.notes}
														</p>
													</TooltipTrigger>
													<TooltipContent side="bottom" className="max-w-xs text-xs">
														{prospect.notes}
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										)}
									</div>
								</div>
							</TableCell>

							{/* Teléfono */}
							<TableCell className="text-sm text-muted-foreground">
								{prospect.contact || "—"}
							</TableCell>

							{/* Fecha */}
							<TableCell className="text-sm">
								<div className="flex flex-col gap-0.5">
									<span>{formatProspectVisitDate(prospect.visitDate)}</span>
									{prospect.meetingSeriesName && (
										<span className="text-xs text-muted-foreground truncate max-w-[160px]">
											{prospect.meetingSeriesName}
										</span>
									)}
								</div>
							</TableCell>

							{/* Agregado por */}
							<TableCell className="text-sm text-muted-foreground">
								{prospect.addedByName ?? "—"}
							</TableCell>

							{/* Fuente */}
							<TableCell>
								<Badge variant="outline" className="text-xs">
									{prospect.source === "pwa" ? "PWA" : "Manual"}
								</Badge>
							</TableCell>

							{/* Miembro */}
							<TableCell>
								{prospect.memberId ? (
									<a
										href={`/members?search=${encodeURIComponent(`${prospect.firstName} ${prospect.lastName}`)}`}
										className="text-primary hover:underline text-xs"
									>
										Ver miembro →
									</a>
								) : (
									<span className="text-muted-foreground text-xs">—</span>
								)}
							</TableCell>

							{/* Ver detalle */}
							<TableCell>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => onView(prospect)}
									className="h-8 w-8 p-0 text-muted-foreground"
									aria-label="Ver detalle"
									title="Ver detalle"
								>
									<Eye className="h-3.5 w-3.5" />
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
