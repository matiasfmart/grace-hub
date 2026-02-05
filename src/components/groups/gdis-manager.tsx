"use client";

import { Phone, Settings, Trash2, UserCheck, UserCircle, Users } from "lucide-react";
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{gdis.map((gdi) => {
						const guide = getGuideDetails(gdi.guideId);
						const mentor = getMentorDetails(gdi.mentorId);
						return (
							<Card
								key={gdi.id}
								className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
							>
								<CardHeader>
									<CardTitle className="font-headline text-2xl text-primary flex items-center">
										<Users className="mr-2 h-6 w-6" /> {gdi.name}
									</CardTitle>
								</CardHeader>
								<CardContent className="flex-grow space-y-3">
									<div>
										<h4 className="font-semibold text-sm mb-1 flex items-center">
											<UserCheck className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
											Guía del GDI:
										</h4>
										<p className="text-muted-foreground text-sm">
											{guide ? `${guide.firstName} ${guide.lastName}` : "N/A"}
										</p>
									</div>
									{guide && (
										<div>
											<h4 className="font-semibold text-sm mb-1 flex items-center">
												<Phone className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
												Teléfono del Guía:
											</h4>
											<a
												href={`tel:${guide.phone}`}
												className="text-primary hover:underline text-sm"
											>
												{guide.phone}
											</a>
										</div>
									)}
									<div>
										<h4 className="font-semibold text-sm mb-1 flex items-center">
											<UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
											Mentor del GDI:
										</h4>
										<p className="text-muted-foreground text-sm">
											{mentor ? `${mentor.firstName} ${mentor.lastName}` : "Sin asignar"}
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
									<CardDescription className="text-sm">
										Miembros: {gdi.memberIds.length}
									</CardDescription>
								</CardContent>
								<CardFooter className="flex flex-col sm:flex-row gap-2">
									<Button
										asChild
										variant="outline"
										className="w-full border-primary text-primary hover:bg-primary/10"
									>
										<Link href={`/groups/gdis/${gdi.id}/admin`}>
											<Settings className="mr-2 h-4 w-4" /> Administrar
										</Link>
									</Button>
									<Button
										variant="destructive"
										size="icon"
										onClick={() => handleDeleteClick(gdi)}
										title={`Eliminar GDI ${gdi.name}`}
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
