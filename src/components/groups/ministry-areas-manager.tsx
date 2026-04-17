"use client";

import { AlertTriangle, MoreVertical, Settings, Trash2, UserCircle, Users, UsersRound } from "lucide-react";
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
import type { Member, MinistryArea } from "@/lib/types";
import DeleteGroupAlert from "./delete-group-alert";

interface MinistryAreasManagerProps {
	ministryAreas: MinistryArea[];
	allMembers: Member[];
	activeMembers: Member[];
	deleteMinistryAreaAction: (
		areaId: string,
	) => Promise<{ success: boolean; message: string }>;
}

export default function MinistryAreasManager({
	ministryAreas,
	allMembers,
	activeMembers,
	deleteMinistryAreaAction,
}: MinistryAreasManagerProps) {
	const [areaToDelete, setAreaToDelete] = useState<MinistryArea | null>(null);
	const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

	const getLeaderDetails = (leaderId: string) => {
		return allMembers.find((member) => member.id === leaderId);
	};

	const getMentorDetails = (mentorId?: string) => {
		if (!mentorId) return undefined;
		return allMembers.find((member) => member.id === mentorId);
	};

	const handleDeleteClick = (area: MinistryArea) => {
		setAreaToDelete(area);
		setIsDeleteAlertOpen(true);
	};

	const confirmDelete = async () => {
		if (!areaToDelete)
			return { success: false, message: "No Area selected for deletion." };
		return deleteMinistryAreaAction(areaToDelete.id);
	};

	return (
		<div>
			{ministryAreas.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{ministryAreas.map((area) => {
						const leader = getLeaderDetails(area.leaderId);
						const mentor = getMentorDetails(area.mentorId);
						const hasMentor = !!mentor;
						const leaderInitials = leader 
							? `${leader.firstName[0]}${leader.lastName[0]}`.toUpperCase()
							: "??";
						
						return (
							<Card
								key={area.id}
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
												<UsersRound className="h-5 w-5 text-primary" />
											</div>
											<div>
												<CardTitle className="text-lg font-semibold">
													{area.name}
												</CardTitle>
												<p className="text-xs text-muted-foreground">
													{area.memberIds.length} miembros
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
													<Link href={`/groups/ministry-areas/${area.id}/admin`}>
														<Settings className="mr-2 h-4 w-4" />
														Administrar
													</Link>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem 
													onClick={() => handleDeleteClick(area)}
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
									{/* Leader */}
									<div className="flex items-center gap-3">
										<Avatar className="h-8 w-8">
											<AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
												{leaderInitials}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{leader ? `${leader.firstName} ${leader.lastName}` : "Sin asignar"}
											</p>
											<p className="text-xs text-muted-foreground">Líder</p>
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
										<Link href={`/groups/ministry-areas/${area.id}/admin`}>
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
					<UsersRound className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
					<h2 className="text-xl font-semibold text-muted-foreground">
						No hay Áreas Ministeriales disponibles
					</h2>
					<p className="text-muted-foreground mt-2">
						Agregue una nueva área ministerial para comenzar.
					</p>
				</div>
			)}
			{areaToDelete && (
				<DeleteGroupAlert
					isOpen={isDeleteAlertOpen}
					onOpenChange={setIsDeleteAlertOpen}
					groupName={areaToDelete.name}
					groupTypeLabel="Área Ministerial"
					onConfirmDelete={confirmDelete}
				/>
			)}
		</div>
	);
}
