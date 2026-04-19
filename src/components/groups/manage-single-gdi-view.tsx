"use client";

import {
	Loader2,
	Save,
	UserCheck,
	UserMinus,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { GDI, Member } from "@/lib/types";

interface ManageSingleGdiViewProps {
	gdi: GDI;
	allMembers: Member[];
	activeMembers: Member[];
	allGdis: GDI[];
	updateGdiAction: (
		gdiIdOrNewData:
			| string
			| (Partial<Omit<GDI, "id">> & { name: string; guideId: string }),
		updatedData?: Partial<Pick<GDI, "name" | "guideId" | "mentorId" | "memberIds">>,
	) => Promise<{
		success: boolean;
		message: string;
		updatedGdi?: GDI;
		newGdi?: GDI;
	}>;
	onSuccess?: () => void;
	isAdding?: boolean;
}

const statusDisplayMap: Record<Member["status"], string> = {
	vigente: "Vigente",
	eliminado: "Eliminado",
};

export default function ManageSingleGdiView({
	gdi: initialGdi,
	allMembers,
	activeMembers,
	allGdis,
	updateGdiAction,
	onSuccess,
	isAdding = false,
}: ManageSingleGdiViewProps) {
	const [editableGdi, setEditableGdi] = useState<GDI>(initialGdi);
	const [addMemberSearchTerm, setAddMemberSearchTerm] = useState("");
	const [selectedAvailableMembers, setSelectedAvailableMembers] = useState<
		string[]
	>([]);
	const [selectedAssignedMembers, setSelectedAssignedMembers] = useState<
		string[]
	>([]);
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	useEffect(() => {
		setEditableGdi(initialGdi);
		setSelectedAvailableMembers([]);
		setSelectedAssignedMembers([]);
		setAddMemberSearchTerm("");
		if (isAdding && initialGdi.guideId) {
			const guide = allMembers.find((m) => m.id === initialGdi.guideId);
			if (guide) {
				setEditableGdi((prev) => ({
					...prev,
					name: `GDI de ${guide.firstName} ${guide.lastName}`,
				}));
			}
		}
	}, [initialGdi, isAdding, allMembers]);

	useEffect(() => {
		if (editableGdi.guideId) {
			const selectedGuide = allMembers.find(
				(m) => m.id === editableGdi.guideId,
			);
			if (selectedGuide) {
				const newDefaultName = `GDI de ${selectedGuide.firstName} ${selectedGuide.lastName}`;

				if (isAdding) {
					if (
						!editableGdi.name.trim() ||
						editableGdi.name.startsWith("GDI de ")
					) {
						setEditableGdi((prev) => ({ ...prev, name: newDefaultName }));
					}
				} else {
					const originalGuide = allMembers.find(
						(m) => m.id === initialGdi.guideId,
					);
					const originalDefaultName = originalGuide
						? `GDI de ${originalGuide.firstName} ${originalGuide.lastName}`
						: "";

					if (
						!editableGdi.name.trim() ||
						editableGdi.name === originalDefaultName
					) {
						setEditableGdi((prev) => ({ ...prev, name: newDefaultName }));
					}
				}
			}
		} else {
			if (isAdding) {
				if (editableGdi.name.startsWith("GDI de ")) {
					setEditableGdi((prev) => ({ ...prev, name: "" }));
				}
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		editableGdi.guideId,
		isAdding,
		initialGdi.guideId,
		allMembers,
		editableGdi.name,
	]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setEditableGdi((prev) => ({ ...prev, [name]: value }));
	};

	const handleGuideChange = (newGuideId: string) => {
		setEditableGdi((prev) => {
			const updatedMemberIds = (prev.memberIds || []).filter(
				(id) => id !== newGuideId,
			);
			return {
				...prev,
				guideId: newGuideId,
				memberIds: updatedMemberIds,
				name: prev.name,
			};
		});
	};

	const handleMentorChange = (newMentorId: string) => {
		setEditableGdi((prev) => ({
			...prev,
			mentorId: newMentorId || undefined,
		}));
	};

	const handleAvailableMemberSelection = (
		memberId: string,
		isChecked: boolean,
	) => {
		setSelectedAvailableMembers((prev) =>
			isChecked ? [...prev, memberId] : prev.filter((id) => id !== memberId),
		);
	};

	const handleAssignedMemberSelection = (
		memberId: string,
		isChecked: boolean,
	) => {
		setSelectedAssignedMembers((prev) =>
			isChecked ? [...prev, memberId] : prev.filter((id) => id !== memberId),
		);
	};

	const handleAddSelectedMembersToGdi = () => {
		if (selectedAvailableMembers.length === 0) return;
		setEditableGdi((prevGdi) => {
			const newFullMemberList = Array.from(
				new Set([...(prevGdi.memberIds || []), ...selectedAvailableMembers]),
			);
			const finalMemberIds = newFullMemberList.filter(
				(id) => id !== prevGdi.guideId,
			);
			return { ...prevGdi, memberIds: finalMemberIds };
		});
		setSelectedAvailableMembers([]);
	};

	const handleRemoveSelectedMembersFromGdi = () => {
		if (selectedAssignedMembers.length === 0) return;
		setEditableGdi((prevGdi) => ({
			...prevGdi,
			memberIds: (prevGdi.memberIds || []).filter(
				(id) => !selectedAssignedMembers.includes(id) && id !== prevGdi.guideId,
			),
		}));
		setSelectedAssignedMembers([]);
	};

	const handleSubmit = () => {
		startTransition(async () => {
			const finalMemberIds = (editableGdi.memberIds || []).filter(
				(id) => id !== editableGdi.guideId,
			);
			const dataToSend = {
				name: editableGdi.name,
				guideId: editableGdi.guideId,
				mentorId: editableGdi.mentorId,
				memberIds: finalMemberIds,
			};

			let result;
			if (isAdding) {
				result = await updateGdiAction(dataToSend);
			} else {
				result = await updateGdiAction(initialGdi.id, dataToSend);
			}

			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				if (result.updatedGdi) setEditableGdi(result.updatedGdi);
				setSelectedAvailableMembers([]);
				setSelectedAssignedMembers([]);
				if (onSuccess) onSuccess();
			} else {
				toast({
					title: "Error",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	};

	const guideDetails = useMemo(() => {
		return allMembers.find((m) => m.id === editableGdi.guideId);
	}, [editableGdi.guideId, allMembers]);

	const availableMembersForAssignment = useMemo(() => {
		return allMembers.filter((member) => {
			if (member.id === editableGdi.guideId) return false;
			if ((editableGdi.memberIds || []).includes(member.id)) return false;
			const isGuideOfAnyOtherGdi = allGdis.some((g) => g.guideId === member.id);
			if (isGuideOfAnyOtherGdi) return false;

			return (
				`${member.firstName} ${member.lastName}`
					.toLowerCase()
					.includes(addMemberSearchTerm.toLowerCase()) ||
				member.email?.toLowerCase().includes(addMemberSearchTerm.toLowerCase())
			);
		});
	}, [
		allMembers,
		editableGdi.guideId,
		editableGdi.memberIds,
		addMemberSearchTerm,
		allGdis,
	]);

	const currentlyAssignedDisplayMembers = useMemo(() => {
		return (editableGdi.memberIds || [])
			.filter((id) => id !== editableGdi.guideId)
			.map((id) => allMembers.find((m) => m.id === id))
			.filter(Boolean) as Member[];
	}, [editableGdi.memberIds, editableGdi.guideId, allMembers]);

	const guideOptions = useMemo(() => {
		return activeMembers.map((member) => ({
			value: member.id,
			label: `${member.firstName} ${member.lastName}${allGdis.some((g) => g.guideId === member.id && (isAdding || g.id !== initialGdi.id)) ? " (Guía de otro GDI)" : ""}`,
			disabled: allGdis.some(
				(g) => g.guideId === member.id && (isAdding || g.id !== initialGdi.id),
			),
		}));
	}, [activeMembers, allGdis, isAdding, initialGdi.id]);

	const mentorOptions = useMemo(() => {
		return [
			{ value: "", label: "Sin asignar" },
			...activeMembers.map((member) => ({
				value: member.id,
				label: `${member.firstName} ${member.lastName}`,
			})),
		];
	}, [activeMembers]);

	return (
		<>
			<CardContent className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-0 pt-4">
				<div className="lg:col-span-2 space-y-6">
					<div className="p-4 border rounded-lg shadow-sm bg-card">
						<h3 className="text-lg font-semibold mb-3 flex items-center">
							<UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />
							Guía del GDI
						</h3>
						<Label htmlFor="guideIdSelect">
							Seleccionar Guía (miembros activos)
						</Label>
						<Combobox
							options={guideOptions}
							value={editableGdi.guideId}
							onChange={handleGuideChange}
							placeholder="Seleccionar nuevo guía"
							searchPlaceholder="Buscar guía..."
							emptyStateMessage="No se encontró ningún miembro activo."
							disabled={isPending}
							triggerClassName="mt-1"
						/>
						{editableGdi.guideId &&
							!activeMembers.find((m) => m.id === editableGdi.guideId) && (
								<p className="text-xs text-destructive mt-1">
									El guía actual no está activo o no se encuentra. Por favor,
									seleccione un guía activo.
								</p>
							)}
					</div>

					<div className="p-4 border rounded-lg shadow-sm bg-card">
						<h3 className="text-lg font-semibold mb-3">Nombre del GDI</h3>
						<Label htmlFor="name">Nombre</Label>
						<Input
							id="name"
							name="name"
							value={editableGdi.name}
							onChange={handleInputChange}
							disabled={isPending}
							className="mt-1"
						/>
					</div>

					<div className="p-4 border rounded-lg shadow-sm bg-card">
						<h3 className="text-lg font-semibold mb-3 flex items-center">
							<UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />
							Mentor del GDI
						</h3>
						<Label htmlFor="mentorIdSelect">
							Seleccionar Mentor (opcional)
						</Label>
						<Combobox
							options={mentorOptions}
							value={editableGdi.mentorId || ""}
							onChange={handleMentorChange}
							placeholder="Seleccionar mentor"
							searchPlaceholder="Buscar mentor..."
							emptyStateMessage="No se encontró ningún miembro activo."
							disabled={isPending}
							triggerClassName="mt-1"
						/>
					</div>
				</div>

				<div className="lg:col-span-3 space-y-6">
					<div className="p-4 border rounded-lg shadow-sm bg-card">
						<h3 className="text-lg font-semibold mb-3 flex items-center">
							<UserPlus className="mr-2 h-5 w-5 text-muted-foreground" />
							Agregar Miembros al GDI
						</h3>
						<Input
							type="search"
							placeholder="Buscar miembros (todos los estados)..."
							value={addMemberSearchTerm}
							onChange={(e) => setAddMemberSearchTerm(e.target.value)}
							className="mb-3"
							disabled={isPending}
						/>
						<ScrollArea className="h-48 w-full rounded-md border p-2">
							{availableMembersForAssignment.length > 0 ? (
								availableMembersForAssignment.map((member) => {
									const otherGdi =
										member.assignedGDIId &&
										member.assignedGDIId !== initialGdi.id
											? allGdis.find((g) => g.id === member.assignedGDIId)
											: null;
									return (
										<div
											key={`available-${member.id}`}
											className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md"
										>
											<Checkbox
												id={`add-member-${member.id}`}
												checked={selectedAvailableMembers.includes(member.id)}
												disabled={isPending}
												onCheckedChange={(checked) =>
													handleAvailableMemberSelection(
														member.id,
														Boolean(checked),
													)
												}
											/>
											<Label
												htmlFor={`add-member-${member.id}`}
												className="font-normal text-sm cursor-pointer flex-grow"
											>
												{member.firstName} {member.lastName} (
												{statusDisplayMap[member.status] || member.status})
												{otherGdi && (
													<span className="text-muted-foreground text-xs">
														{" "}
														(En GDI: {otherGdi.name})
													</span>
												)}
											</Label>
										</div>
									);
								})
							) : (
								<p className="text-sm text-muted-foreground text-center py-4">
									{addMemberSearchTerm
										? "No hay miembros que coincidan."
										: "No hay miembros disponibles (verifique que no sean guías de GDI o ya estén en este GDI)."}
								</p>
							)}
						</ScrollArea>
						<Button
							onClick={handleAddSelectedMembersToGdi}
							disabled={isPending || selectedAvailableMembers.length === 0}
							className="w-full mt-3"
							variant="outline"
						>
							<UserPlus className="mr-2 h-4 w-4" /> Agregar Seleccionados al GDI
							({selectedAvailableMembers.length})
						</Button>
					</div>

					<div className="p-4 border rounded-lg shadow-sm bg-card">
						<h3 className="text-lg font-semibold mb-3 flex items-center">
							<Users className="mr-2 h-5 w-5 text-muted-foreground" />
							Miembros Actualmente Asignados
						</h3>
						<p className="text-sm text-muted-foreground mb-1">
							Guía:{" "}
							{guideDetails
								? `${guideDetails.firstName} ${guideDetails.lastName} (${statusDisplayMap[guideDetails.status] || guideDetails.status})`
								: "Ninguno seleccionado"}
						</p>
						<p className="text-sm text-muted-foreground mb-3">
							Total de miembros (excluyendo guía):{" "}
							{currentlyAssignedDisplayMembers.length}
						</p>
						<ScrollArea className="h-48 w-full rounded-md border p-2">
							{currentlyAssignedDisplayMembers.map((member) => (
								<div
									key={`assigned-${member.id}`}
									className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md"
								>
									<Checkbox
										id={`remove-member-${member.id}`}
										checked={selectedAssignedMembers.includes(member.id)}
										disabled={isPending}
										onCheckedChange={(checked) =>
											handleAssignedMemberSelection(member.id, Boolean(checked))
										}
									/>
									<Label
										htmlFor={`remove-member-${member.id}`}
										className="font-normal text-sm cursor-pointer flex-grow"
									>
										{member.firstName} {member.lastName} (
										{statusDisplayMap[member.status] || member.status})
									</Label>
								</div>
							))}
							{currentlyAssignedDisplayMembers.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									Ningún miembro adicional asignado.
								</p>
							)}
						</ScrollArea>
						<Button
							onClick={handleRemoveSelectedMembersFromGdi}
							disabled={isPending || selectedAssignedMembers.length === 0}
							className="w-full mt-3"
							variant="destructive"
						>
							<UserMinus className="mr-2 h-4 w-4" /> Quitar Seleccionados del
							GDI ({selectedAssignedMembers.length})
						</Button>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-4 border-t pt-6 mt-6">
				<DialogClose asChild>
					<Button variant="outline" disabled={isPending}>
						Cancelar
					</Button>
				</DialogClose>
				<Button
					onClick={handleSubmit}
					disabled={
						isPending || !editableGdi.guideId || !editableGdi.name.trim()
					}
				>
					{isPending ? (
						<Loader2 className="animate-spin mr-2" />
					) : (
						<Save className="mr-2 h-4 w-4" />
					)}
					{isPending
						? isAdding
							? "Creando..."
							: "Guardando..."
						: isAdding
							? "Crear GDI"
							: "Guardar Cambios"}
				</Button>
			</CardFooter>
		</>
	);
}
