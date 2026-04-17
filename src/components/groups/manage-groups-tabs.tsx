"use client";

import { AlertTriangle, PlusCircle, Users, UsersRound } from "lucide-react";
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

	// KPIs calculados
	const stats = useMemo(() => {
		const areasWithoutMentor = initialMinistryAreas.filter(a => !a.mentorId).length;
		const gdisWithoutMentor = initialGdis.filter(g => !g.mentorId).length;
		const totalMembers = new Set([
			...initialMinistryAreas.flatMap(a => a.memberIds),
			...initialGdis.flatMap(g => g.memberIds)
		]).size;
		return {
			totalAreas: initialMinistryAreas.length,
			totalGdis: initialGdis.length,
			withoutMentor: areasWithoutMentor + gdisWithoutMentor,
			totalMembers,
		};
	}, [initialMinistryAreas, initialGdis]);

	const [activeTab, setActiveTab] = useState<"ministry-areas" | "gdis">("ministry-areas");

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
			{/* KPI Summary Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<Card className="border-l-4 border-l-primary">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<UsersRound className="h-8 w-8 text-primary" />
							<div>
								<p className="text-2xl font-bold">{stats.totalAreas}</p>
								<p className="text-xs text-muted-foreground">Áreas</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-primary">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<Users className="h-8 w-8 text-primary" />
							<div>
								<p className="text-2xl font-bold">{stats.totalGdis}</p>
								<p className="text-xs text-muted-foreground">GDIs</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-blue-400">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<Users className="h-8 w-8 text-blue-400" />
							<div>
								<p className="text-2xl font-bold">{stats.totalMembers}</p>
								<p className="text-xs text-muted-foreground">Miembros asignados</p>
							</div>
						</div>
					</CardContent>
				</Card>
				{stats.withoutMentor > 0 && (
					<Card className="border-l-4 border-l-warning bg-warning/5">
						<CardContent className="p-4">
							<div className="flex items-center gap-3">
								<AlertTriangle className="h-8 w-8 text-warning" />
								<div>
									<p className="text-2xl font-bold">{stats.withoutMentor}</p>
									<p className="text-xs text-muted-foreground">Sin mentor</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Navigation Bar with Tabs and Action Button */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ministry-areas" | "gdis")} className="w-full sm:w-auto">
					<TabsList className="grid w-full sm:w-auto grid-cols-2">
						<TabsTrigger value="ministry-areas" className="gap-2">
							<UsersRound className="h-4 w-4" />
							<span className="hidden sm:inline">Áreas Ministeriales</span>
							<span className="sm:hidden">Áreas</span>
							<span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{stats.totalAreas}</span>
						</TabsTrigger>
						<TabsTrigger value="gdis" className="gap-2">
							<Users className="h-4 w-4" />
							<span>GDIs</span>
							<span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{stats.totalGdis}</span>
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<Button
					onClick={() => activeTab === "ministry-areas" ? setIsAddAreaDialogOpen(true) : setIsAddGdiDialogOpen(true)}
					disabled={isPending}
					className="w-full sm:w-auto"
				>
					<PlusCircle className="mr-2 h-4 w-4" />
					{activeTab === "ministry-areas" ? "Nueva Área" : "Nuevo GDI"}
				</Button>
			</div>

			{/* Content */}
			{activeTab === "ministry-areas" ? (
				<MinistryAreasManager
					ministryAreas={initialMinistryAreas}
					allMembers={allMembers}
					activeMembers={activeMembers}
					deleteMinistryAreaAction={deleteMinistryAreaAction}
				/>
			) : (
				<GdisManager
					gdis={initialGdis}
					allMembers={allMembers}
					activeMembers={activeMembers}
					deleteGdiAction={deleteGdiAction}
				/>
			)}

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
