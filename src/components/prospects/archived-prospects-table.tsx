"use client";

import { useMemo } from "react";
import { Archive, Eye } from "lucide-react";
import type { Prospect } from "@/lib/types";
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

interface ArchivedProspectsTableProps {
	prospects: Prospect[];
	onView: (prospect: Prospect) => void;
}

function formatVisitDate(dateStr: string): string {
	const [year, month, day] = dateStr.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString("es-ES", {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
	});
}

export default function ArchivedProspectsTable({ prospects, onView }: ArchivedProspectsTableProps) {
	const sorted = useMemo(
		() => [...prospects].sort((a, b) => b.visitDate.localeCompare(a.visitDate)),
		[prospects],
	);

	if (sorted.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground rounded-lg border">
				<Archive className="h-12 w-12 mb-4 opacity-30" />
				<p className="text-lg font-medium">No hay visitantes archivados</p>
				<p className="text-sm mt-1">Los visitantes descartados aparecerán aquí.</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border overflow-hidden opacity-90">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/20">
						<TableHead>Visitante</TableHead>
						<TableHead>Teléfono</TableHead>
						<TableHead>Fecha de visita</TableHead>
						<TableHead>Agregado por</TableHead>
						<TableHead>Fuente</TableHead>
						<TableHead className="w-[52px]">
							<span className="sr-only">Acciones</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map((prospect) => (
						<TableRow key={prospect.id} className="opacity-70 hover:opacity-90 transition-opacity">
							{/* Visitante */}
							<TableCell>
								<div className="flex items-center gap-3">
									<Avatar className="h-8 w-8">
										<AvatarFallback className="text-xs bg-muted text-muted-foreground">
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
							<TableCell className="text-sm text-muted-foreground">
								{formatVisitDate(prospect.visitDate)}
							</TableCell>

							{/* Agregado por */}
							<TableCell className="text-sm text-muted-foreground">
								{prospect.addedByName ?? "—"}
							</TableCell>

							{/* Fuente */}
							<TableCell>
								<Badge variant="outline" className="text-xs opacity-60">
									{prospect.source === "pwa" ? "PWA" : "Manual"}
								</Badge>
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
