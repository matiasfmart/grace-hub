"use client";

import {
	Home,
	ListChecks,
	Loader2,
	Save,
	Trash2,
	Undo2,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/lib/types"; // Added AddMemberFormValues
import { NONE_GDI_OPTION_VALUE } from "@/lib/types"; // Added NONE_GDI_OPTION_VALUE
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
	const { toast } = useToast();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleStageMember = useCallback(
		(newMemberData: AddMemberFormValues) => {
			const memberWithStagingId: Member = {
				id: `staged-${Date.now()}-${stagedMembers.length}`,
				firstName: newMemberData.firstName,
				lastName: newMemberData.lastName,
				email: newMemberData.email || "",
				phone: newMemberData.phone,
				birthDate: newMemberData.birthDate
					? newMemberData.birthDate.toISOString().split("T")[0]
					: undefined,
				churchJoinDate: newMemberData.churchJoinDate
					? newMemberData.churchJoinDate.toISOString().split("T")[0]
					: undefined,
				baptismDate: newMemberData.baptismDate || "",
				attendsLifeSchool: newMemberData.attendsLifeSchool,
				attendsBibleInstitute: newMemberData.attendsBibleInstitute,
				fromAnotherChurch: newMemberData.fromAnotherChurch,
				status: newMemberData.status,
				avatarUrl: newMemberData.avatarUrl || "https://placehold.co/100x100",
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
		if (!member.assignedGDIId) return "No asignado";
		const gdi = allGDIs.find((g) => g.id === member.assignedGDIId);
		if (!gdi) return "GDI no encontrado";
		const guide = allMembers.find((m) => m.id === gdi.guideId);
		return guide
			? `${guide.firstName} ${guide.lastName}`
			: "Guía no encontrado";
	};

	const displayStatus = (status: Member["status"]) => {
		switch (status) {
			case "Active":
				return "Activo";
			case "Inactive":
				return "Inactivo";
			case "New":
				return "Nuevo";
			default:
				return status;
		}
	};

	const handleClearProcessedList = () => {
		setRecentlyProcessedMembers([]);
		toast({
			title: "Lista Limpia",
			description:
				"La lista de miembros recientemente procesados ha sido limpiada.",
		});
	};

	const handleReturnToDirectory = () => {
		router.push("/members");
	};

	const renderMembersTable = (
		membersToList: Member[],
		isStagedTable: boolean,
	) => (
		<div className="overflow-x-auto max-h-[calc(100vh-400px)]">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[60px]">Avatar</TableHead>
						<TableHead>Nombre Completo</TableHead>
						<TableHead>Teléfono</TableHead>
						<TableHead>Guía GDI</TableHead>
						<TableHead>Estado</TableHead>
						{isStagedTable && (
							<TableHead className="text-right">Acción</TableHead>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{membersToList.map((member) => (
						<TableRow key={member.id}>
							<TableCell>
								<Avatar className="h-9 w-9">
									<AvatarImage
										src={member.avatarUrl}
										alt={`${member.firstName} ${member.lastName}`}
										data-ai-hint="person portrait"
									/>
									<AvatarFallback>
										{member.firstName.substring(0, 1)}
										{member.lastName.substring(0, 1)}
									</AvatarFallback>
								</Avatar>
							</TableCell>
							<TableCell>
								{member.firstName} {member.lastName}
							</TableCell>
							<TableCell>{member.phone}</TableCell>
							<TableCell>{getGdiGuideNameFromList(member)}</TableCell>
							<TableCell>
								<Badge
									variant={
										member.status === "Active"
											? "default"
											: member.status === "Inactive"
												? "secondary"
												: "outline"
									}
									className={
										member.status === "Active"
											? "bg-green-500/20 text-green-700 border-green-500/50"
											: member.status === "Inactive"
												? "bg-red-500/20 text-red-700 border-red-500/50"
												: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50"
									}
								>
									{displayStatus(member.status)}
								</Badge>
							</TableCell>
							{isStagedTable && (
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleRemoveStagedMember(member.id)}
										title="Remover de la lista"
										disabled={isPending}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							)}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-1">
					<Card className="sticky top-4">
						<CardHeader>
							<CardTitle>Formulario de Nuevo Miembro</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
								<AddMemberForm
									onSubmitMember={handleStageMember}
									allGDIs={allGDIs}
									allMinistryAreas={allMinistryAreas}
									allMembers={allMembers}
									submitButtonText="Preparar Miembro"
									cancelButtonText="Limpiar Formulario"
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="lg:col-span-2 space-y-8">
					<Card>
						<CardHeader>
							<div className="flex justify-between items-center">
								<CardTitle className="flex items-center">
									<Users className="mr-2 h-6 w-6" /> Miembros Preparados (
									{stagedMembers.length})
								</CardTitle>
								<Button
									onClick={handleSaveAllStagedMembers}
									disabled={stagedMembers.length === 0 || isPending}
									size="lg"
								>
									{isPending ? (
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									) : (
										<Save className="mr-2 h-5 w-5" />
									)}
									{isPending ? "Guardando..." : "Guardar Lote Actual"}
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{stagedMembers.length > 0 ? (
								renderMembersTable(stagedMembers, true)
							) : (
								<div className="text-center py-10 text-muted-foreground">
									<Users className="mx-auto h-12 w-12 mb-4" />
									<p>No hay miembros en la lista de preparación.</p>
									<p>
										Use el formulario de la izquierda para agregar miembros.
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{recentlyProcessedMembers.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex justify-between items-center">
									<CardTitle className="flex items-center">
										<ListChecks className="mr-2 h-6 w-6 text-green-600" />{" "}
										Miembros Recientemente Procesados (
										{recentlyProcessedMembers.length})
									</CardTitle>
									<div className="flex gap-2">
										<Button
											onClick={handleClearProcessedList}
											variant="outline"
											disabled={isPending}
										>
											<Undo2 className="mr-2 h-4 w-4" /> Limpiar Lista de
											Procesados
										</Button>
									</div>
								</div>
								<p className="text-sm text-muted-foreground pt-2">
									Estos miembros han sido procesados en esta sesión.
								</p>
							</CardHeader>
							<CardContent>
								{renderMembersTable(recentlyProcessedMembers, false)}
							</CardContent>
						</Card>
					)}
				</div>
			</div>
			<div className="text-center mt-8 lg:col-span-3 pb-8">
				<Button
					onClick={handleReturnToDirectory}
					variant="outline"
					size="lg"
					disabled={isPending}
				>
					<Home className="mr-2 h-4 w-4" /> Volver al Directorio de Miembros
				</Button>
			</div>
		</div>
	);
}
