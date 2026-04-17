"use client";

import { AlertTriangle, MoreVertical, Settings, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
}

export default function GdisManager({
	gdis,
	allMembers,
	activeMembers,
	deleteGdiAction,
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

	return (
		<div>
			{gdis.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{gdis.map((gdi) => {
						const guide = getGuideDetails(gdi.guideId);
						const mentor = getMentorDetails(gdi.mentorId);
						const hasMentor = !!mentor;
						const guideInitials = guide 
							? `${guide.firstName[0]}${guide.lastName[0]}`.toUpperCase()
							: "??";
						
						return (
							<Card
								key={gdi.id}
								className={cn(
									"flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg",
									hasMentor 
										? "border-l-4 border-l-green-500" 
										: "border-l-4 border-l-warning"
								)}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
												<Users className="h-5 w-5 text-primary" />
											</div>
											<div>
												<CardTitle className="text-lg font-semibold">
													{gdi.name}
												</CardTitle>
												<p className="text-xs text-muted-foreground">
													{gdi.memberIds.length} miembros
												</p>
											</div>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem asChild>
													<Link href={`/groups/gdis/${gdi.id}/admin`}>
														<Settings className="mr-2 h-4 w-4" />
														Administrar
													</Link>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem 
													onClick={() => handleDeleteClick(gdi)}
													className="text-destructive focus:text-destructive"
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Eliminar
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</CardHeader>
								<CardContent className="flex-grow space-y-4 pb-4">
									{/* Guide */}
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
													<AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
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
												<div className="h-8 w-8 rounded-full border-2 border-dashed border-warning flex items-center justify-center">
													<AlertTriangle className="h-4 w-4 text-warning" />
												</div>
												<div className="flex-1">
													<Badge variant="warning" className="text-xs">Sin mentor</Badge>
												</div>
											</>
										)}
									</div>
								</CardContent>
								<CardFooter className="pt-0">
									<Button
										asChild
										variant="outline"
										size="sm"
										className="w-full"
									>
										<Link href={`/groups/gdis/${gdi.id}/admin`}>
											<Settings className="mr-2 h-4 w-4" /> Administrar
										</Link>
									</Button>
								</CardFooter>
							</Card>
						);
					})}
				</div>
			) : (
				<div className="text-center py-10">
					<Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
					<h2 className="text-xl font-semibold text-muted-foreground">
						No hay GDIs disponibles
					</h2>
					<p className="text-muted-foreground mt-2">
						Agregue un nuevo GDI para comenzar.
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
