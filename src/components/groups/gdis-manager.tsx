"use client";

import { AlertTriangle, CalendarDays, MoreVertical, TrendingUp, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { GDI, Member } from "@/lib/types";
import DeleteGroupAlert from "./delete-group-alert";

interface GdisManagerProps {
	gdis: GDI[];
	allMembers: Member[];
	activeMembers: Member[];
	deleteGdiAction: (
		gdiId: string,
	) => Promise<{ success: boolean; message: string }>;
	searchTerm?: string;
	mentorFilter?: string;
}

/** Devuelve color del badge de asistencia según umbral pastoral */
function attendanceBadgeClass(pct: number | null | undefined): string {
	if (pct == null) return "bg-muted text-muted-foreground";
	if (pct >= 70) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
	if (pct >= 50) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
	return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

/** Calcula días desde una fecha ISO (YYYY-MM-DD) */
function daysSince(isoDate: string | null | undefined): number | null {
	if (!isoDate) return null;
	return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

export default function GdisManager({
	gdis,
	allMembers,
	deleteGdiAction,
	searchTerm = "",
	mentorFilter = "",
}: GdisManagerProps) {
	const [gdiToDelete, setGdiToDelete] = useState<GDI | null>(null);
	const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

	const getGuideDetails = (guideId: string) => {
		return allMembers.find((member) => member.id === guideId);
	};

	const getMentorDetails = (mentorId?: string) => {
		if (!mentorId) return undefined;
		return allMembers.find((member) => member.id === mentorId);
	};

	const handleDeleteClick = (gdi: GDI) => {
		setGdiToDelete(gdi);
		setIsDeleteAlertOpen(true);
	};

	const confirmDelete = async () => {
		if (!gdiToDelete)
			return { success: false, message: "No GDI selected for deletion." };
		return deleteGdiAction(gdiToDelete.id);
	};

	// Filtrado client-side: búsqueda por nombre + filtro por mentor
	const filteredGdis = gdis.filter(gdi => {
		const matchesSearch = !searchTerm ||
			gdi.name.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesMentor = !mentorFilter ||
			gdi.mentorId === mentorFilter;
		return matchesSearch && matchesMentor;
	});

	return (
		<div>
			{filteredGdis.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredGdis.map((gdi) => {
						const guide = getGuideDetails(gdi.guideId);
						const mentor = getMentorDetails(gdi.mentorId);
						const hasMentor = !!mentor;
						const guideInitials = guide
							? `${guide.firstName[0]}${guide.lastName[0]}`.toUpperCase()
							: "??";

						const dias = daysSince(gdi.lastMeetingDate);
						const diasLabel = dias === null
							? "Sin reuniones"
							: dias === 0
								? "Hoy"
								: `Hace ${dias}d`;
						const diasWarning = dias !== null && dias > 14;

						return (
							/* Card completa como unidad navegable — Mejora 2 */
							<Link
								key={gdi.id}
								href={`/groups/gdis/${gdi.id}/admin`}
								className="block group"
							>
								<Card
									className={cn(
										"flex flex-col overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-0.5",
										hasMentor
											? "border-l-4 border-l-green-500"
											: "border-l-4 border-l-amber-400"
									)}
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
													<Users className="h-5 w-5 text-primary" />
												</div>
												<div>
													<CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
														{gdi.name}
													</CardTitle>
													<p className="text-xs text-muted-foreground">
														{gdi.memberIds.length} miembros
													</p>
												</div>
											</div>
											{/* 3-dot: solo "Eliminar" — la card ya navega a admin */}
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														onClick={e => e.preventDefault()}
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={e => {
															e.preventDefault();
															handleDeleteClick(gdi);
														}}
														className="text-destructive focus:text-destructive"
													>
														<Trash2 className="mr-2 h-4 w-4" />
														Eliminar
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</CardHeader>
									<CardContent className="space-y-3 pb-4">
										{/* Guía */}
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
													{guideInitials}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{guide ? `${guide.firstName} ${guide.lastName}` : "Sin asignar"}
												</p>
												<p className="text-xs text-muted-foreground">Guía</p>
											</div>
										</div>
										{/* Mentor */}
										<div className="flex items-center gap-3">
											{mentor ? (
												<>
													<Avatar className="h-8 w-8">
														<AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium dark:bg-blue-900/30 dark:text-blue-400">
															{`${mentor.firstName[0]}${mentor.lastName[0]}`.toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium truncate">
															{mentor.firstName} {mentor.lastName}
														</p>
														<p className="text-xs text-muted-foreground">Mentor</p>
													</div>
												</>
											) : (
												<>
													<div className="h-8 w-8 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center">
														<AlertTriangle className="h-4 w-4 text-amber-400" />
													</div>
													<div className="flex-1">
														<Badge variant="warning" className="text-xs">Sin mentor</Badge>
													</div>
												</>
											)}
										</div>
										{/* Indicadores de salud — Mejora 9 */}
										<div className="flex items-center gap-2 pt-1 border-t border-border/40">
											<span className={cn(
												"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
												attendanceBadgeClass(gdi.avgAttendancePct)
											)}>
												<TrendingUp className="h-3 w-3" />
												{gdi.avgAttendancePct != null ? `${gdi.avgAttendancePct}%` : "—"}
											</span>
											<span className={cn(
												"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
												diasWarning
													? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
													: "bg-muted text-muted-foreground"
											)}>
												<CalendarDays className="h-3 w-3" />
												{diasLabel}
											</span>
										</div>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>
			) : (
				<div className="text-center py-10">
					<Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
					<h2 className="text-xl font-semibold text-muted-foreground">
						{searchTerm || mentorFilter ? "No se encontraron GDIs" : "No hay GDIs disponibles"}
					</h2>
					<p className="text-muted-foreground mt-2">
						{searchTerm || mentorFilter
							? "Intentá con otros filtros de búsqueda."
							: "Agregá un nuevo GDI para comenzar."
						}
					</p>
				</div>
			)}
			{gdiToDelete && (
				<DeleteGroupAlert
					isOpen={isDeleteAlertOpen}
					onOpenChange={setIsDeleteAlertOpen}
					groupName={gdiToDelete.name}
					groupTypeLabel="GDI"
					onConfirmDelete={confirmDelete}
				/>
			)}
		</div>
	);
}
