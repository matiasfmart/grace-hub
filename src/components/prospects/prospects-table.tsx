"use client";

import { UserPlus, Archive, Eye, Pencil } from "lucide-react";
import type { GDI, Prospect } from "@/lib/types";
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

interface ProspectsTableProps {
	prospects: Prospect[];
	allGDIs: GDI[];
	isProcessing: boolean;
	onIntegrate: (prospect: Prospect) => void;
	onArchive: (prospect: Prospect) => void;
	onEdit: (prospect: Prospect) => void;
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

export default function ProspectsTable({
	prospects,
	allGDIs: _allGDIs,
	isProcessing,
	onIntegrate,
	onArchive,
	onEdit,
	onView,
}: ProspectsTableProps) {
	if (prospects.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground rounded-lg border">
				<UserPlus className="h-12 w-12 mb-4 opacity-30" />
				<p className="text-lg font-medium">No hay visitantes pendientes</p>
				<p className="text-sm mt-1">
					Los visitantes registrados por el equipo de bienvenida aparecerán aquí.
				</p>
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
						<TableHead className="w-[190px]">
							<span className="sr-only">Acciones</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{prospects.map((prospect) => (
						<TableRow key={prospect.id}>
							{/* Visitante */}
							<TableCell>
								<div className="flex items-center gap-3">
									<Avatar className="h-8 w-8">
										<AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
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
								{formatVisitDate(prospect.visitDate)}
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

							{/* Acciones */}
							<TableCell>
								<div className="flex items-center gap-1">
									<Button
										size="sm"
										variant="default"
										disabled={isProcessing}
										onClick={() => onIntegrate(prospect)}
										className="h-8 text-xs"
									>
										<UserPlus className="h-3.5 w-3.5 mr-1" />
										Integrar
									</Button>
									<Button
										size="sm"
										variant="ghost"
										disabled={isProcessing}
										onClick={() => onEdit(prospect)}
										className="h-8 text-xs text-muted-foreground"
										aria-label="Editar visitante"
										title="Editar visitante"
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										disabled={isProcessing}
										onClick={() => onArchive(prospect)}
										className="h-8 text-xs text-muted-foreground"
										aria-label="Archivar visitante"
										title="Archivar visitante"
									>
										<Archive className="h-3.5 w-3.5" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										disabled={isProcessing}
										onClick={() => onView(prospect)}
										className="h-8 w-8 p-0 text-muted-foreground"
										aria-label="Ver detalle"
										title="Ver detalle"
									>
										<Eye className="h-3.5 w-3.5" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
