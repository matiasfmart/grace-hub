"use client";

import { AlertTriangle, PlusCircle, Search, Users, UserCheck, UsersRound } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { GDI, Member, MinistryArea } from "@/lib/types";
import { Button } from "../ui/button";
import GdisManager from "./gdis-manager";
import ManageSingleGdiView from "./manage-single-gdi-view";
import ManageSingleMinistryAreaView from "./manage-single-ministry-area-view";
import MinistryAreasManager from "./ministry-areas-manager";

interface ManageGroupsTabsProps {
	initialMinistryAreas: MinistryArea[];
	initialGdis: GDI[];
	allMembers: Member[];
	addMinistryAreaAction: (
		data: Partial<Omit<MinistryArea, "id">> & {
			name: string;
			leaderId: string;
			memberIds?: string[];
		},
	) => Promise<{ success: boolean; message: string; newArea?: MinistryArea }>;
	addGdiAction: (
		data: Partial<Omit<GDI, "id">> & {
			name: string;
			guideId: string;
			memberIds?: string[];
		},
	) => Promise<{ success: boolean; message: string; newGdi?: GDI }>;
	deleteGdiAction: (
		gdiId: string,
	) => Promise<{ success: boolean; message: string }>;
	deleteMinistryAreaAction: (
		areaId: string,
	) => Promise<{ success: boolean; message: string }>;
}

const newGdiTemplate: GDI = { id: "new", name: "", guideId: "", memberIds: [] };
const newAreaTemplate: MinistryArea = {
	id: "new",
	name: "",
	description: "",
	leaderId: "",
	mentorId: "",
	memberIds: [],
};

export default function ManageGroupsTabs({
	initialMinistryAreas,
	initialGdis,
	allMembers,
	addMinistryAreaAction,
	addGdiAction,
	deleteGdiAction,
	deleteMinistryAreaAction,
}: ManageGroupsTabsProps) {
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	const [isAddGdiDialogOpen, setIsAddGdiDialogOpen] = useState(false);
	const [isAddAreaDialogOpen, setIsAddAreaDialogOpen] = useState(false);

	const activeMembers = useMemo(
		() => allMembers.filter((m) => m.status === "vigente"),
		[allMembers],
	);

	// KPIs de cobertura (ADR-004: todo miembro activo debe tener GDI)
	const stats = useMemo(() => {
		const gdisWithMentor = initialGdis.filter(g => !!g.mentorId).length;
		const areasWithMentor = initialMinistryAreas.filter(a => !!a.mentorId).length;

		// Miembros sin GDI — viola RN-001
		const allGdiGuideIds = new Set(initialGdis.map(g => g.guideId).filter(Boolean));
		const allGdiMemberIds = new Set(initialGdis.flatMap(g => g.memberIds));
		const membersWithoutGdi = activeMembers.filter(
			m => !allGdiGuideIds.has(m.id) && !allGdiMemberIds.has(m.id)
		).length;

		return {
			totalAreas: initialMinistryAreas.length,
			totalGdis: initialGdis.length,
			gdisWithMentor,
			areasWithMentor,
			membersWithoutGdi,
		};
	}, [initialMinistryAreas, initialGdis, activeMembers]);

	// Búsqueda y filtro
	const [searchTerm, setSearchTerm] = useState("");
	const [mentorFilter, setMentorFilter] = useState<string>("all");

	// Mentores únicos (cross-GDIs + Áreas) para el filtro
	const uniqueMentors = useMemo(() => {
		const mentorIds = new Set<string>();
		[...initialGdis, ...initialMinistryAreas].forEach(g => {
			if (g.mentorId) mentorIds.add(g.mentorId);
		});
		return Array.from(mentorIds)
			.map(id => {
				const member = allMembers.find(m => m.id === id);
				return member ? { id, label: `${member.firstName} ${member.lastName}` } : null;
			})
			.filter((x): x is { id: string; label: string } => x !== null)
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [initialGdis, initialMinistryAreas, allMembers]);

	const [activeTab, setActiveTab] = useState<"ministry-areas" | "gdis">("gdis");

	const handleAddMinistryAreaSubmit = useCallback(
		async (
			areaIdOrNewData:
				| string
				| (Partial<Omit<MinistryArea, "id">> & {
						name: string;
						leaderId: string;
				  }),
			_unusedUpdatedData?: Partial<
				Pick<MinistryArea, "leaderId" | "memberIds" | "name" | "description">
			>,
		) => {
			// When adding, the first param will always be an object, not a string ID
			if (typeof areaIdOrNewData === "string") {
				throw new Error(
					"Expected area data object for add operation, got string ID",
				);
			}

			const areaData = areaIdOrNewData;
			let actionResult: {
				success: boolean;
				message: string;
				newArea?: MinistryArea;
			} = { success: false, message: "Error al iniciar la creación del área." };

			await new Promise<void>((resolve) => {
				startTransition(async () => {
					actionResult = await addMinistryAreaAction(areaData);
					if (actionResult.success && actionResult.newArea) {
						toast({ title: "Éxito", description: actionResult.message });
						setIsAddAreaDialogOpen(false);
					} else {
						toast({
							title: "Error",
							description: actionResult.message,
							variant: "destructive",
						});
					}
					resolve();
				});
			});
			return actionResult;
		},
		[addMinistryAreaAction, toast],
	);

	const handleAddGdiSubmit = useCallback(
		async (
			gdiIdOrNewData:
				| string
				| (Partial<Omit<GDI, "id">> & { name: string; guideId: string }),
			_unusedUpdatedData?: Partial<Pick<GDI, "name" | "guideId" | "memberIds">>,
		) => {
			// When adding, the first param will always be an object, not a string ID
			if (typeof gdiIdOrNewData === "string") {
				throw new Error(
					"Expected GDI data object for add operation, got string ID",
				);
			}

			const gdiData = gdiIdOrNewData;
			let actionResult: { success: boolean; message: string; newGdi?: GDI } = {
				success: false,
				message: "Error al iniciar la creación del GDI.",
			};

			await new Promise<void>((resolve) => {
				startTransition(async () => {
					actionResult = await addGdiAction(gdiData);
					if (actionResult.success && actionResult.newGdi) {
						toast({ title: "Éxito", description: actionResult.message });
						setIsAddGdiDialogOpen(false);
					} else {
						toast({
							title: "Error",
							description: actionResult.message,
							variant: "destructive",
						});
					}
					resolve();
				});
			});
			return actionResult;
		},
		[addGdiAction, toast],
	);

	return (
		<>
			{/* KPI de cobertura — muestra estado estructural de la organización */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<Card className="border-l-4 border-l-primary">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<Users className="h-8 w-8 text-primary" />
							<div>
								<p className="text-2xl font-bold">{stats.totalGdis}</p>
								<p className="text-xs text-muted-foreground">GDIs activos</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className={`border-l-4 ${stats.gdisWithMentor < stats.totalGdis ? "border-l-amber-400" : "border-l-emerald-500"}`}>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<UserCheck className={`h-8 w-8 ${stats.gdisWithMentor < stats.totalGdis ? "text-amber-400" : "text-emerald-500"}`} />
							<div>
								<p className="text-2xl font-bold">{stats.gdisWithMentor}/{stats.totalGdis}</p>
								<p className="text-xs text-muted-foreground">GDIs con mentor</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-primary">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<UsersRound className="h-8 w-8 text-primary" />
							<div>
								<p className="text-2xl font-bold">{stats.totalAreas}</p>
								<p className="text-xs text-muted-foreground">Áreas activas</p>
							</div>
						</div>
					</CardContent>
				</Card>
				{/* Alerta RN-001: miembros sin GDI */}
				<Card className={`border-l-4 ${stats.membersWithoutGdi > 0 ? "border-l-destructive bg-destructive/5" : "border-l-emerald-500"}`}>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							{stats.membersWithoutGdi > 0
								? <AlertTriangle className="h-8 w-8 text-destructive" />
								: <UserCheck className="h-8 w-8 text-emerald-500" />
							}
							<div>
								<p className="text-2xl font-bold">{stats.membersWithoutGdi}</p>
								<p className="text-xs text-muted-foreground">
									{stats.membersWithoutGdi > 0 ? "Sin GDI ⚠" : "Todos en un GDI"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Barra de búsqueda + filtros + acción */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Buscar grupo por nombre..."
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						className="pl-9"
					/>
				</div>
				{uniqueMentors.length > 0 && (
					<Select value={mentorFilter} onValueChange={setMentorFilter}>
						<SelectTrigger className="w-full sm:w-[200px]">
							<SelectValue placeholder="Filtrar por mentor" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos los mentores</SelectItem>
							{uniqueMentors.map(m => (
								<SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<Button
					onClick={() => activeTab === "ministry-areas" ? setIsAddAreaDialogOpen(true) : setIsAddGdiDialogOpen(true)}
					disabled={isPending}
					className="w-full sm:w-auto shrink-0"
				>
					<PlusCircle className="mr-2 h-4 w-4" />
					{activeTab === "ministry-areas" ? "Nueva Área" : "Nuevo GDI"}
				</Button>
			</div>

			{/* Tabs de navegación — GDIs primero (RN-001: el GDI es la base) */}
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ministry-areas" | "gdis")} className="space-y-6">
				<TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2">
					<TabsTrigger value="gdis" className="gap-2">
						<Users className="h-4 w-4" />
						<span>GDIs</span>
						<span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{stats.totalGdis}</span>
					</TabsTrigger>
					<TabsTrigger value="ministry-areas" className="gap-2">
						<UsersRound className="h-4 w-4" />
						<span className="hidden sm:inline">Áreas Ministeriales</span>
						<span className="sm:hidden">Áreas</span>
						<span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{stats.totalAreas}</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="gdis">
					<GdisManager
						gdis={initialGdis}
						allMembers={allMembers}
						activeMembers={activeMembers}
						deleteGdiAction={deleteGdiAction}
						searchTerm={searchTerm}
						mentorFilter={mentorFilter === "all" ? "" : mentorFilter}
					/>
				</TabsContent>

				<TabsContent value="ministry-areas">
					<MinistryAreasManager
						ministryAreas={initialMinistryAreas}
						allMembers={allMembers}
						activeMembers={activeMembers}
						deleteMinistryAreaAction={deleteMinistryAreaAction}
						searchTerm={searchTerm}
						mentorFilter={mentorFilter === "all" ? "" : mentorFilter}
					/>
				</TabsContent>
			</Tabs>

			<Dialog open={isAddAreaDialogOpen} onOpenChange={setIsAddAreaDialogOpen}>
				<DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
					<DialogHeader className="p-6 pb-4 border-b">
						<DialogTitle>Agregar Nueva Área Ministerial</DialogTitle>
						<DialogDescription>
							Defina los detalles para la nueva área, asigne un líder y agregue
							miembros.
						</DialogDescription>
					</DialogHeader>
					<div className="flex-grow overflow-y-auto p-1 sm:p-6">
						<ManageSingleMinistryAreaView
							ministryArea={newAreaTemplate}
							allMembers={allMembers}
							activeMembers={activeMembers}
							updateMinistryAreaAction={handleAddMinistryAreaSubmit}
							isAdding={true}
							onSuccess={() => setIsAddAreaDialogOpen(false)}
						/>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isAddGdiDialogOpen} onOpenChange={setIsAddGdiDialogOpen}>
				<DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
					<DialogHeader className="p-6 pb-4 border-b">
						<DialogTitle>Agregar Nuevo GDI</DialogTitle>
						<DialogDescription>
							Defina el nombre para el nuevo GDI, asigne un guía y agregue
							miembros.
						</DialogDescription>
					</DialogHeader>
					<div className="flex-grow overflow-y-auto p-1 sm:p-6">
						<ManageSingleGdiView
							gdi={newGdiTemplate}
							allMembers={allMembers}
							activeMembers={activeMembers}
							allGdis={initialGdis}
							updateGdiAction={handleAddGdiSubmit}
							isAdding={true}
							onSuccess={() => setIsAddGdiDialogOpen(false)}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
