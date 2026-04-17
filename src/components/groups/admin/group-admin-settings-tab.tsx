"use client";

import { Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { GDI, Member, MinistryArea } from "@/lib/types";

interface GroupAdminSettingsTabProps {
	groupType: "gdi" | "area";
	group: GDI | MinistryArea;
	allMembers: Member[];
	activeMembers: Member[];
	allGroups: (GDI | MinistryArea)[]; // For validation (e.g., guide can't be guide of multiple GDIs)
	onUpdate: (data: {
		name: string;
		leaderId: string;
		mentorId?: string;
		description?: string;
	}) => Promise<{ success: boolean; message: string }>;
	onDelete: () => Promise<{ success: boolean; message: string }>;
}

export default function GroupAdminSettingsTab({
	groupType,
	group,
	allMembers,
	activeMembers,
	allGroups,
	onUpdate,
	onDelete,
}: GroupAdminSettingsTabProps) {
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();
	const [isDeleting, setIsDeleting] = useState(false);

	// Form state
	const isGdi = groupType === "gdi";
	const gdi = isGdi ? (group as GDI) : null;
	const area = !isGdi ? (group as MinistryArea) : null;

	const [name, setName] = useState(group.name);
	const [leaderId, setLeaderId] = useState(isGdi ? gdi!.guideId : area!.leaderId);
	const [mentorId, setMentorId] = useState(isGdi ? gdi!.mentorId || "" : area!.mentorId || "");
	const [description, setDescription] = useState(!isGdi ? area!.description || "" : "");

	// Build leader options
	const leaderOptions = activeMembers.map(member => {
		// Check if this member is already a leader of another group
		const isLeaderElsewhere = allGroups.some(g => {
			if (g.id === group.id) return false;
			if (isGdi) {
				return (g as GDI).guideId === member.id;
			}
			return false; // Areas can share leaders
		});

		return {
			value: member.id,
			label: `${member.firstName} ${member.lastName}${isLeaderElsewhere ? ` (${isGdi ? "Guía" : "Líder"} de otro grupo)` : ""}`,
			disabled: isLeaderElsewhere,
		};
	});

	// Mentor options (all active members)
	const mentorOptions = [
		{ value: "", label: "Sin asignar" },
		...activeMembers.map(member => ({
			value: member.id,
			label: `${member.firstName} ${member.lastName}`,
		})),
	];

	const handleSubmit = () => {
		if (!name.trim() || !leaderId) {
			toast({
				title: "Error",
				description: `El nombre y el ${isGdi ? "guía" : "líder"} son requeridos`,
				variant: "destructive",
			});
			return;
		}

		startTransition(async () => {
			const result = await onUpdate({
				name: name.trim(),
				leaderId,
				mentorId: mentorId || undefined,
				description: description.trim() || undefined,
			});

			if (result.success) {
				toast({ title: "Éxito", description: result.message });
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await onDelete();
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				// Navigation will be handled by parent
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		} finally {
			setIsDeleting(false);
		}
	};

	const hasChanges = () => {
		if (name !== group.name) return true;
		if (isGdi) {
			if (leaderId !== gdi!.guideId) return true;
			if ((mentorId || "") !== (gdi!.mentorId || "")) return true;
		} else {
			if (leaderId !== area!.leaderId) return true;
			if ((mentorId || "") !== (area!.mentorId || "")) return true;
			if ((description || "") !== (area!.description || "")) return true;
		}
		return false;
	};

	return (
		<div className="space-y-6 max-w-2xl">
			{/* Group Information */}
			<Card>
				<CardHeader>
					<CardTitle>Información del {isGdi ? "GDI" : "Área"}</CardTitle>
					<CardDescription>
						Configure los datos básicos del grupo
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Nombre</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={`Nombre del ${isGdi ? "GDI" : "área"}`}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="leader">{isGdi ? "Guía" : "Líder"}</Label>
						<Combobox
							options={leaderOptions}
							value={leaderId}
							onChange={setLeaderId}
							placeholder={`Seleccionar ${isGdi ? "guía" : "líder"}`}
							searchPlaceholder="Buscar miembro..."
							emptyStateMessage="No se encontraron miembros"
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="mentor">Mentor (opcional)</Label>
						<Combobox
							options={mentorOptions}
							value={mentorId}
							onChange={setMentorId}
							placeholder="Seleccionar mentor"
							searchPlaceholder="Buscar miembro..."
							emptyStateMessage="No se encontraron miembros"
							disabled={isPending}
						/>
					</div>

					{!isGdi && (
						<div className="space-y-2">
							<Label htmlFor="description">Descripción (opcional)</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Descripción del área ministerial"
								disabled={isPending}
								rows={3}
							/>
						</div>
					)}

					<div className="flex justify-end pt-4">
						<Button
							onClick={handleSubmit}
							disabled={isPending || !hasChanges()}
						>
							{isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Save className="mr-2 h-4 w-4" />
							)}
							Guardar Cambios
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle className="text-destructive flex items-center gap-2">
						<AlertTriangle className="h-5 w-5" />
						Zona de Peligro
					</CardTitle>
					<CardDescription>
						Acciones irreversibles que afectan permanentemente al grupo
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="font-medium">Eliminar {isGdi ? "GDI" : "Área"}</p>
							<p className="text-sm text-muted-foreground">
								Esta acción no se puede deshacer. Se eliminarán también las reuniones asociadas.
							</p>
						</div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" disabled={isDeleting}>
									{isDeleting ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Trash2 className="mr-2 h-4 w-4" />
									)}
									Eliminar
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
									<AlertDialogDescription>
										Esta acción eliminará permanentemente el {isGdi ? "GDI" : "área"} &quot;{group.name}&quot;
										y todas sus reuniones asociadas. Esta acción no se puede deshacer.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDelete}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										Eliminar
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
