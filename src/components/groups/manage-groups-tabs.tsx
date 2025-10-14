"use client";

import { PlusCircle } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
		() => allMembers.filter((m) => m.status === "Active"),
		[allMembers],
	);

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
			<Tabs defaultValue="ministry-areas" className="w-full">
				<TabsList className="grid w-full grid-cols-2 mb-6">
					<TabsTrigger value="ministry-areas">Áreas Ministeriales</TabsTrigger>
					<TabsTrigger value="gdis">GDIs (Grupos de Integración)</TabsTrigger>
				</TabsList>
				<TabsContent value="ministry-areas">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-2xl font-semibold">Áreas Ministeriales</h2>
						<Button
							onClick={() => setIsAddAreaDialogOpen(true)}
							disabled={isPending}
						>
							<PlusCircle className="mr-2 h-4 w-4" /> Agregar Nueva Área
						</Button>
					</div>
					<MinistryAreasManager
						ministryAreas={initialMinistryAreas}
						allMembers={allMembers}
						activeMembers={activeMembers}
						deleteMinistryAreaAction={deleteMinistryAreaAction}
					/>
				</TabsContent>
				<TabsContent value="gdis">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-2xl font-semibold">
							GDIs (Grupos de Integración)
						</h2>
						<Button
							onClick={() => setIsAddGdiDialogOpen(true)}
							disabled={isPending}
						>
							<PlusCircle className="mr-2 h-4 w-4" /> Agregar Nuevo GDI
						</Button>
					</div>
					<GdisManager
						gdis={initialGdis}
						allMembers={allMembers}
						activeMembers={activeMembers}
						deleteGdiAction={deleteGdiAction}
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
