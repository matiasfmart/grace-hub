"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import type { GDI, Member, Prospect } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
	integrateProspectAction,
	archiveProspectAction,
	getProspectsByStatusAction,
	updateProspectAction,
} from "@/app/(protected)/actions/prospectActions";
import ProspectsKpiCards from "./prospects-kpi-cards";
import ProspectsTable from "./prospects-table";
import IntegrateProspectDialog from "./integrate-prospect-dialog";
import ArchiveProspectConfirm from "./archive-prospect-confirm";
import RegisterProspectDialog from "./register-prospect-dialog";
import EditProspectDialog from "./edit-prospect-dialog";
import IntegratedProspectsTable from "./integrated-prospects-table";
import ArchivedProspectsTable from "./archived-prospects-table";
import { cn } from "@/lib/utils";

type SubTab = "pendientes" | "integrados" | "archivados";

interface ProspectsTabContentProps {
	initialPending: Prospect[];
	allGDIs: GDI[];
	allMembers: Member[];
}

export default function ProspectsTabContent({
	initialPending,
	allGDIs,
	allMembers,
}: ProspectsTabContentProps) {
	const router = useRouter();
	const { toast } = useToast();

	const [subTab, setSubTab] = useState<SubTab>("pendientes");
	const [pendingProspects, setPendingProspects] = useState<Prospect[]>(initialPending);
	const [integratedProspects, setIntegratedProspects] = useState<Prospect[] | null>(null);
	const [lostProspects, setLostProspects] = useState<Prospect[] | null>(null);

	// E5: track which specific tab is loading to avoid race conditions on rapid tab clicks
	const [loadingTab, setLoadingTab] = useState<SubTab | null>(null);

	const [integrateTarget, setIntegrateTarget] = useState<Prospect | null>(null);
	const [archiveTarget, setArchiveTarget] = useState<Prospect | null>(null);
	const [editTarget, setEditTarget] = useState<Prospect | null>(null);
	const [viewTarget, setViewTarget] = useState<Prospect | null>(null);
	const [isRegisterOpen, setIsRegisterOpen] = useState(false);

	// E4: per-operation transitions so each dialog reflects only its own loading state
	const [isIntegrating, startIntegrateTransition] = useTransition();
	const [isArchiving, startArchiveTransition] = useTransition();
	const [isEditing, startEditTransition] = useTransition();

	// ─── Register new prospect manually ───────────────────────────────────────
	const handleProspectCreated = (prospect: Prospect) => {
		setPendingProspects((prev) => [prospect, ...prev]);
	};

	// ─── Edit prospect ────────────────────────────────────────────────────────
	const handleProspectUpdated = (updated: Prospect) => {
		setPendingProspects((prev) =>
			prev.map((p) => (p.id === updated.id ? updated : p)),
		);
	};

	// ─── Sub-tab navigation with on-demand fetching ───────────────────────────
	// E1: toast on error instead of silent blank state
	// E5: setLoadingTab tracks which tab is loading; only clears if it's still the same one
	const handleSubTabChange = async (tab: SubTab) => {
		setSubTab(tab);

		if (tab === "integrados" && integratedProspects === null) {
			setLoadingTab("integrados");
			const result = await getProspectsByStatusAction("integrated");
			if (result.success) {
				setIntegratedProspects(result.data);
			} else {
				toast({
					title: "Error al cargar integrados",
					description: result.message ?? "No se pudieron cargar los datos.",
					variant: "destructive",
				});
				setIntegratedProspects([]); // show empty state, clear spinner
			}
			setLoadingTab((prev) => (prev === "integrados" ? null : prev));
		} else if (tab === "archivados" && lostProspects === null) {
			setLoadingTab("archivados");
			const result = await getProspectsByStatusAction("lost");
			if (result.success) {
				setLostProspects(result.data);
			} else {
				toast({
					title: "Error al cargar archivados",
					description: result.message ?? "No se pudieron cargar los datos.",
					variant: "destructive",
				});
				setLostProspects([]); // show empty state, clear spinner
			}
			setLoadingTab((prev) => (prev === "archivados" ? null : prev));
		}
	};

	// ─── Integrate ────────────────────────────────────────────────────────────
	const handleConfirmIntegrate = (prospectId: string, gdiId?: string) => {
		setIntegrateTarget(null);
		startIntegrateTransition(async () => {
			const result = await integrateProspectAction(prospectId, gdiId);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				setPendingProspects((prev) => prev.filter((p) => p.id !== prospectId));
				setIntegratedProspects(null); // invalidate cache; re-fetches on next visit
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	// ─── Archive ──────────────────────────────────────────────────────────────
	const handleConfirmArchive = (prospectId: string) => {
		setArchiveTarget(null);
		startArchiveTransition(async () => {
			const result = await archiveProspectAction(prospectId);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				setPendingProspects((prev) => prev.filter((p) => p.id !== prospectId));
				setLostProspects(null); // invalidate cache; re-fetches on next visit
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	// ─── Render ───────────────────────────────────────────────────────────────
	return (
		<>
			<ProspectsKpiCards
				pendingProspects={pendingProspects}
				integratedProspects={integratedProspects}
			/>

			{/* Sub-tabs + Register button */}
			<div className="flex items-center justify-between border-b mb-6">
				<div className="flex gap-1">
					{(["pendientes", "integrados", "archivados"] as SubTab[]).map((tab) => (
						<button
							key={tab}
							type="button"
							onClick={() => handleSubTabChange(tab)}
							className={cn(
								"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
								subTab === tab
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{/* M1: show count once data is available for each tab */}
							{tab === "pendientes" && `Pendientes (${pendingProspects.length})`}
							{tab === "integrados" &&
								(integratedProspects !== null
									? `Integrados (${integratedProspects.length})`
									: "Integrados")}
							{tab === "archivados" &&
								(lostProspects !== null
									? `Archivados (${lostProspects.length})`
									: "Archivados")}
						</button>
					))}
				</div>

				{/* M4: register button only makes sense on the pendientes tab */}
				{subTab === "pendientes" && (
					<Button
						size="sm"
						variant="outline"
						className="mb-px shrink-0"
						onClick={() => setIsRegisterOpen(true)}
					>
						<UserPlus className="h-4 w-4 mr-2" />
						Registrar visitante
					</Button>
				)}
			</div>

			{/* Sub-tab content — spinner only for the currently selected loading tab */}
			{loadingTab === subTab ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : (
				<>
					{subTab === "pendientes" && (
						<ProspectsTable
							prospects={pendingProspects}
							allGDIs={allGDIs}
						isProcessing={isIntegrating || isArchiving || isEditing}
						onIntegrate={(p) => setIntegrateTarget(p)}
						onArchive={(p) => setArchiveTarget(p)}
						onEdit={(p) => setEditTarget(p)}
						onView={(p) => setViewTarget(p)}
						/>
					)}
					{subTab === "integrados" && integratedProspects !== null && (
						<IntegratedProspectsTable
						prospects={integratedProspects}
						onView={(p) => setViewTarget(p)}
					/>
					)}
					{subTab === "archivados" && lostProspects !== null && (
						<ArchivedProspectsTable
						prospects={lostProspects}
						onView={(p) => setViewTarget(p)}
					/>
					)}
				</>
			)}

			{/* Dialogs */}
			<RegisterProspectDialog
				isOpen={isRegisterOpen}
				onClose={() => setIsRegisterOpen(false)}
				onProspectCreated={handleProspectCreated}
				allMembers={allMembers}
			/>
			<EditProspectDialog
				prospect={editTarget}
				isOpen={editTarget !== null}
				onClose={() => setEditTarget(null)}
				onUpdated={handleProspectUpdated}
			/>
			<EditProspectDialog
				prospect={viewTarget}
				isOpen={viewTarget !== null}
				onClose={() => setViewTarget(null)}
				readOnly
			/>
			{/* E4: each dialog receives only its own isProcessing state */}
			<IntegrateProspectDialog
				prospect={integrateTarget}
				allGDIs={allGDIs}
				isOpen={integrateTarget !== null}
				onClose={() => setIntegrateTarget(null)}
				onConfirm={handleConfirmIntegrate}
				isProcessing={isIntegrating}
			/>
			<ArchiveProspectConfirm
				prospect={archiveTarget}
				isOpen={archiveTarget !== null}
				onClose={() => setArchiveTarget(null)}
				onConfirm={handleConfirmArchive}
				isProcessing={isArchiving}
			/>
		</>
	);
}
