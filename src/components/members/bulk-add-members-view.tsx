"use client";

import {
	ChevronDown,
	ChevronUp,
	ListChecks,
	Loader2,
	Pencil,
	Save,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type {
	AddMemberFormValues,
	GDI,
	Member,
	MemberWriteData,
	MinistryArea,
} from "@/lib/types";
import { NONE_GDI_OPTION_VALUE } from "@/lib/types";
import AddMemberForm from "./add-member-form";

interface BulkAddMembersViewProps {
	allGDIs: GDI[];
	allMinistryAreas: MinistryArea[];
	allMembers: Member[]; // These are existing members, used for select dropdowns
	addBulkMembersAction: (
		stagedMembersData: MemberWriteData[],
	) => Promise<{ success: boolean; message: string }>;
}

export default function BulkAddMembersView({
	allGDIs,
	allMinistryAreas,
	allMembers,
	addBulkMembersAction,
}: BulkAddMembersViewProps) {
	const [stagedMembers, setStagedMembers] = useState<Member[]>([]);
	const [recentlyProcessedMembers, setRecentlyProcessedMembers] = useState<
		Member[]
	>([]);
	const [editingMember, setEditingMember] = useState<Member | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [showProcessed, setShowProcessed] = useState(true);
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();

	const handleStageMember = useCallback(
		(newMemberData: AddMemberFormValues, memberId?: string) => {
			// If editing an existing staged member
			if (memberId) {
				setStagedMembers((prev) =>
					prev.map((m) =>
						m.id === memberId
							? {
									...m,
									firstName: newMemberData.firstName,
									lastName: newMemberData.lastName,
									email: newMemberData.email || "",
									phone: newMemberData.phone,
									birthDate: newMemberData.birthDate?.toISOString().split("T")[0],
									churchJoinDate: newMemberData.churchJoinDate?.toISOString().split("T")[0],
									baptismDate: newMemberData.baptismDate?.toISOString().split("T")[0],
									attendsLifeSchool: newMemberData.attendsLifeSchool,
									attendsBibleInstitute: newMemberData.attendsBibleInstitute,
									fromAnotherChurch: newMemberData.fromAnotherChurch,
									status: newMemberData.status,
									address: newMemberData.address || "",
									assignedGDIId:
										newMemberData.assignedGDIId === NONE_GDI_OPTION_VALUE
											? null
											: newMemberData.assignedGDIId,
									assignedAreaIds: newMemberData.assignedAreaIds || [],
								}
							: m,
					),
				);
				setIsEditDialogOpen(false);
				setEditingMember(null);
				toast({
					title: "Miembro Actualizado",
					description: `${newMemberData.firstName} ${newMemberData.lastName} ha sido actualizado.`,
				});
				return;
			}

			// Adding new member
			const memberWithStagingId: Member = {
				id: `staged-${Date.now()}-${stagedMembers.length}`,
				firstName: newMemberData.firstName,
				lastName: newMemberData.lastName,
				email: newMemberData.email || "",
				phone: newMemberData.phone,
				birthDate: newMemberData.birthDate?.toISOString().split("T")[0],
				churchJoinDate: newMemberData.churchJoinDate?.toISOString().split("T")[0],
				baptismDate: newMemberData.baptismDate?.toISOString().split("T")[0],
				attendsLifeSchool: newMemberData.attendsLifeSchool,
				attendsBibleInstitute: newMemberData.attendsBibleInstitute,
				fromAnotherChurch: newMemberData.fromAnotherChurch,
				status: newMemberData.status,
				address: newMemberData.address || "",
				assignedGDIId:
					newMemberData.assignedGDIId === NONE_GDI_OPTION_VALUE
						? null
						: newMemberData.assignedGDIId,
				assignedAreaIds: newMemberData.assignedAreaIds || [],
			};
			setStagedMembers((prev) => [...prev, memberWithStagingId]);
			toast({
				title: "Miembro Preparado",
				description: `${newMemberData.firstName} ${newMemberData.lastName} ha sido agregado a la lista de preparación.`,
			});
		},
		[toast, stagedMembers.length],
	);

	const handleEditStagedMember = (member: Member) => {
		setEditingMember(member);
		setIsEditDialogOpen(true);
	};

	const handleRemoveStagedMember = (memberId: string) => {
		setStagedMembers((prev) => prev.filter((member) => member.id !== memberId));
		toast({
			title: "Miembro Removido",
			description: "El miembro ha sido removido de la lista de preparación.",
			variant: "destructive",
		});
	};

	const handleSaveAllStagedMembers = () => {
		if (stagedMembers.length === 0) {
			toast({
				title: "Lista Vacía",
				description: "No hay miembros en la lista para guardar.",
				variant: "destructive",
			});
			return;
		}

		const membersToSave: MemberWriteData[] = stagedMembers.map(
			({ id, ...memberData }) => memberData,
		);

		startTransition(async () => {
			const result = await addBulkMembersAction(membersToSave);
			if (result.success) {
				setRecentlyProcessedMembers((prev) => [
					...prev,
					...stagedMembers.map((m) => ({ ...m, id: `processed-${m.id}` })),
				]);
				setStagedMembers([]);
				toast({
					title: "Éxito",
					description: result.message,
				});
			} else {
				toast({
					title: "Error al Guardar",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	};

	const getGdiGuideNameFromList = (member: Member): string => {
		if (!member.assignedGDIId) return "Sin GDI";
		const gdi = allGDIs.find((g) => g.id === member.assignedGDIId);
		if (!gdi) return "GDI no encontrado";
		const guide = allMembers.find((m) => m.id === gdi.guideId);
		return guide ? `${guide.firstName} ${guide.lastName}` : gdi.name;
	};

	const handleClearProcessedList = () => {
		setRecentlyProcessedMembers([]);
		toast({
			title: "Lista Limpia",
			description:
				"La lista de miembros recientemente procesados ha sido limpiada.",
		});
	};

	const renderMembersTable = (
		membersToList: Member[],
		isStagedTable: boolean,
	) => (
		<div className="overflow-x-auto max-h-[300px]">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[40px]"></TableHead>
						<TableHead>Nombre</TableHead>
						<TableHead>Teléfono</TableHead>
						<TableHead className="hidden md:table-cell">GDI</TableHead>
						{isStagedTable && (
							<TableHead className="text-right w-[100px]">Acciones</TableHead>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{membersToList.map((member) => (
						<TableRow key={member.id}>
							<TableCell>
								<Avatar className="h-8 w-8">
									<AvatarFallback className="text-xs">
										{member.firstName.substring(0, 1)}
										{member.lastName.substring(0, 1)}
									</AvatarFallback>
								</Avatar>
							</TableCell>
							<TableCell className="font-medium">
								{member.firstName} {member.lastName}
							</TableCell>
							<TableCell className="text-muted-foreground">{member.phone}</TableCell>
							<TableCell className="hidden md:table-cell text-muted-foreground">
								{getGdiGuideNameFromList(member)}
							</TableCell>
							{isStagedTable && (
								<TableCell className="text-right">
									<div className="flex justify-end gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() => handleEditStagedMember(member)}
											title="Editar"
											disabled={isPending}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() => handleRemoveStagedMember(member.id)}
											title="Remover"
											disabled={isPending}
										>
											<Trash2 className="h-3.5 w-3.5 text-destructive" />
										</Button>
									</div>
								</TableCell>
							)}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);

	return (
		<>
			<div className="space-y-6">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-1">
						<Card className="sticky top-20">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg">Nuevo Miembro</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
									<AddMemberForm
										onSubmitMember={handleStageMember}
										allGDIs={allGDIs}
										allMinistryAreas={allMinistryAreas}
										allMembers={allMembers}
										submitButtonText="+ Agregar a Lista"
										cancelButtonText="Limpiar"
									/>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="lg:col-span-2 space-y-4">
						<Card>
							<CardHeader className="pb-3">
								<div className="flex justify-between items-center">
									<CardTitle className="flex items-center text-lg">
										<Users className="mr-2 h-5 w-5" /> 
										Preparados
										{stagedMembers.length > 0 && (
											<Badge variant="secondary" className="ml-2">
												{stagedMembers.length}
											</Badge>
										)}
									</CardTitle>
									<Button
										onClick={handleSaveAllStagedMembers}
										disabled={stagedMembers.length === 0 || isPending}
									>
										{isPending ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<Save className="mr-2 h-4 w-4" />
										)}
										{isPending ? "Guardando..." : "Guardar Lote"}
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{stagedMembers.length > 0 ? (
									renderMembersTable(stagedMembers, true)
								) : (
									<div className="text-center py-8 text-muted-foreground">
										<Users className="mx-auto h-10 w-10 mb-3 opacity-50" />
										<p className="text-sm">Lista de preparación vacía</p>
										<p className="text-xs">Use el formulario para agregar miembros</p>
									</div>
								)}
							</CardContent>
						</Card>

						{recentlyProcessedMembers.length > 0 && (
							<Collapsible open={showProcessed} onOpenChange={setShowProcessed}>
								<Card>
									<CardHeader className="pb-3">
										<div className="flex justify-between items-center">
											<CollapsibleTrigger asChild>
												<button className="flex items-center gap-2 hover:text-primary transition-colors">
													<CardTitle className="flex items-center text-lg cursor-pointer">
														<ListChecks className="mr-2 h-5 w-5 text-green-600" />
														Procesados
																<Badge variant="outline" className="ml-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
															{recentlyProcessedMembers.length}
														</Badge>
													</CardTitle>
													{showProcessed ? (
														<ChevronUp className="h-4 w-4" />
													) : (
														<ChevronDown className="h-4 w-4" />
													)}
												</button>
											</CollapsibleTrigger>
											<Button
												onClick={handleClearProcessedList}
												variant="ghost"
												size="sm"
												disabled={isPending}
											>
												<X className="mr-1 h-3.5 w-3.5" /> Limpiar
											</Button>
										</div>
									</CardHeader>
									<CollapsibleContent>
										<CardContent className="pt-0">
											{renderMembersTable(recentlyProcessedMembers, false)}
										</CardContent>
									</CollapsibleContent>
								</Card>
							</Collapsible>
						)}
					</div>
				</div>
			</div>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							Editar: {editingMember?.firstName} {editingMember?.lastName}
						</DialogTitle>
					</DialogHeader>
					{editingMember && (
						<AddMemberForm
							onSubmitMember={handleStageMember}
							onDialogClose={() => {
								setIsEditDialogOpen(false);
								setEditingMember(null);
							}}
							initialMemberData={editingMember}
							allGDIs={allGDIs}
							allMinistryAreas={allMinistryAreas}
							allMembers={allMembers}
							submitButtonText="Guardar Cambios"
							cancelButtonText="Cancelar"
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
