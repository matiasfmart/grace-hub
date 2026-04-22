"use client";

import { Check, Loader2, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { RoleType } from "@/lib/api/mappers";
import {
	createRoleTypeAction,
	updateRoleTypeAction,
	deleteRoleTypeAction,
} from "./actions";

interface RoleTypesViewProps {
	initialRoleTypes: RoleType[];
}

export function RoleTypesView({ initialRoleTypes }: RoleTypesViewProps) {
	const [roleTypes, setRoleTypes] = useState<RoleType[]>(initialRoleTypes);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newRoleTypeName, setNewRoleTypeName] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	const handleCreateRoleType = () => {
		if (!newRoleTypeName.trim()) {
			toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
			return;
		}
		startTransition(async () => {
			const result = await createRoleTypeAction(newRoleTypeName.trim());
			if (result.success && result.roleType) {
				setRoleTypes((prev) => [...prev, result.roleType!]);
				setNewRoleTypeName("");
				setIsCreateDialogOpen(false);
				toast({ title: "Éxito", description: result.message });
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const startEdit = (roleType: RoleType) => {
		setEditingId(roleType.id);
		setEditingName(roleType.name);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditingName("");
	};

	const handleUpdateRoleType = (roleType: RoleType) => {
		const trimmed = editingName.trim();
		if (!trimmed) {
			toast({ title: "Error", description: "El nombre no puede estar vacío", variant: "destructive" });
			return;
		}
		if (trimmed === roleType.name) {
			cancelEdit();
			return;
		}
		startTransition(async () => {
			const result = await updateRoleTypeAction(roleType.id, trimmed);
			if (result.success && result.roleType) {
				setRoleTypes((prev) => prev.map((rt) => (rt.id === result.roleType!.id ? result.roleType! : rt)));
				cancelEdit();
				toast({ title: "Éxito", description: result.message });
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const handleDeleteRoleType = (roleType: RoleType) => {
		startTransition(async () => {
			const result = await deleteRoleTypeAction(roleType.id, roleType.name);
			if (result.success) {
				setRoleTypes((prev) => prev.filter((rt) => rt.id !== roleType.id));
				toast({ title: "Éxito", description: result.message });
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Etiquetas Eclesiásticas</h1>
					<p className="text-muted-foreground">
						Administra las etiquetas de roles eclesiásticos como Pastor, Diácono, Anciano, etc.
					</p>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							Nueva Etiqueta
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Nueva Etiqueta Eclesiástica</DialogTitle>
							<DialogDescription>
								Crea una nueva etiqueta para identificar roles eclesiásticos de los miembros.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="name">Nombre</Label>
								<Input
									id="name"
									placeholder="Ej: Pastor, Diácono, Anciano..."
									value={newRoleTypeName}
									onChange={(e) => setNewRoleTypeName(e.target.value)}
									onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoleType(); }}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isPending}>
								Cancelar
							</Button>
							<Button onClick={handleCreateRoleType} disabled={isPending}>
								{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Crear
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Tag className="h-5 w-5" />
						Etiquetas Configuradas
					</CardTitle>
					<CardDescription>
						Estas etiquetas se pueden asignar a los miembros y usar como filtro en reuniones.
						Haz clic en el lápiz para renombrar una etiqueta.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{roleTypes.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>No hay etiquetas eclesiásticas configuradas</p>
							<p className="text-sm">Haz clic en &quot;Nueva Etiqueta&quot; para crear una.</p>
						</div>
					) : (
						<div className="grid gap-2">
							{roleTypes.map((roleType) => (
								<div
									key={roleType.id}
									className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
								>
									<Tag className="h-4 w-4 shrink-0 text-muted-foreground" />

									{editingId === roleType.id ? (
										<>
											<Input
												className="h-7 flex-1 text-sm"
												value={editingName}
												onChange={(e) => setEditingName(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") handleUpdateRoleType(roleType);
													if (e.key === "Escape") cancelEdit();
												}}
												autoFocus
												disabled={isPending}
											/>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-green-600 hover:text-green-700"
												onClick={() => handleUpdateRoleType(roleType)}
												disabled={isPending}
											>
												{isPending ? (
													<Loader2 className="h-3.5 w-3.5 animate-spin" />
												) : (
													<Check className="h-3.5 w-3.5" />
												)}
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												onClick={cancelEdit}
												disabled={isPending}
											>
												<X className="h-3.5 w-3.5" />
											</Button>
										</>
									) : (
										<>
											<span className="flex-1 font-medium text-sm">{roleType.name}</span>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-muted-foreground hover:text-foreground"
												onClick={() => startEdit(roleType)}
												disabled={isPending}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 text-destructive hover:text-destructive"
														disabled={isPending}
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>¿Eliminar etiqueta?</AlertDialogTitle>
														<AlertDialogDescription>
															¿Estás seguro de que deseas eliminar la etiqueta &quot;{roleType.name}&quot;?
															Se quitará de todos los miembros que la tengan asignada. Esta acción no se puede deshacer.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancelar</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => handleDeleteRoleType(roleType)}
															className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
														>
															Eliminar
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Información</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground space-y-2">
					<p>
						Las etiquetas eclesiásticas te permiten identificar roles especiales de los miembros
						de tu iglesia, como Pastor, Diácono, Anciano, Ministro de Alabanza, etc.
					</p>
					<p>Una vez creadas, podrás:</p>
					<ul className="list-disc list-inside space-y-1 ml-2">
						<li>Asignarlas a miembros individuales desde el detalle del miembro</li>
						<li>Usarlas como filtro al definir reuniones (audiencia &quot;Por categorías&quot;)</li>
						<li>Al renombrar una etiqueta, el cambio se refleja automáticamente en todos los miembros</li>
						<li>Al eliminar una etiqueta, se quita automáticamente de todos los miembros</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
