"use client";

import { Phone, Settings, Trash2, UserCircle, UserCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{ministryAreas.map((area) => {
						const leader = getLeaderDetails(area.leaderId);
						const mentor = getMentorDetails(area.mentorId);
						return (
							<Card
								key={area.id}
								className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
							>
								<CardHeader>
									<CardTitle className="font-headline text-2xl text-primary flex items-center">
										<UsersRound className="mr-2 h-6 w-6" /> {area.name}
									</CardTitle>
									<CardDescription className="text-sm h-20 overflow-y-auto">
										{area.description}
									</CardDescription>
								</CardHeader>
								<CardContent className="flex-grow space-y-3">
									<div>
										<h4 className="font-semibold text-sm mb-1 flex items-center">
											<UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
											Líder del Área:
										</h4>
										<p className="text-muted-foreground text-sm">
											{leader
												? `${leader.firstName} ${leader.lastName}`
												: "N/A"}
										</p>
									</div>
									{leader && (
										<div>
											<h4 className="font-semibold text-sm mb-1 flex items-center">
												<Phone className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
												Teléfono del Líder:
											</h4>
											<a
												href={`tel:${leader.phone}`}
												className="text-primary hover:underline text-sm"
											>
												{leader.phone}
											</a>
										</div>
									)}
									<div>
										<h4 className="font-semibold text-sm mb-1 flex items-center">
											<UserCheck className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
											Mentor del Área:
										</h4>
										<p className="text-muted-foreground text-sm">
											{mentor
												? `${mentor.firstName} ${mentor.lastName}`
												: "Sin asignar"}
										</p>
									</div>
									{mentor && (
										<div>
											<h4 className="font-semibold text-sm mb-1 flex items-center">
												<Phone className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
												Teléfono del Mentor:
											</h4>
											<a
												href={`tel:${mentor.phone}`}
												className="text-primary hover:underline text-sm"
											>
												{mentor.phone}
											</a>
										</div>
									)}
									<CardDescription className="text-sm pt-2">
										Miembros: {area.memberIds.length}
									</CardDescription>
								</CardContent>
								<CardFooter className="flex flex-col sm:flex-row gap-2">
									<Button
										asChild
										variant="outline"
										className="w-full border-primary text-primary hover:bg-primary/10"
									>
										<Link href={`/groups/ministry-areas/${area.id}/admin`}>
											<Settings className="mr-2 h-4 w-4" /> Administrar
										</Link>
									</Button>
									<Button
										variant="destructive"
										size="icon"
										onClick={() => handleDeleteClick(area)}
										title={`Eliminar Área ${area.name}`}
									>
										<Trash2 className="h-4 w-4" />
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
