"use client";

import type { Prospect } from "@/lib/types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ArchiveProspectConfirmProps {
	prospect: Prospect | null;
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (prospectId: string) => void;
	isProcessing: boolean;
}

export default function ArchiveProspectConfirm({
	prospect,
	isOpen,
	onClose,
	onConfirm,
	isProcessing,
}: ArchiveProspectConfirmProps) {
	if (!prospect) return null;

	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Archivar visitante?</AlertDialogTitle>
					<AlertDialogDescription>
						<strong>
							{prospect.firstName} {prospect.lastName}
						</strong>{" "}
						pasará al archivo de visitantes. Podrás ver el historial en el tab
						&quot;Archivados&quot;. Esta acción no elimina ningún dato.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => onConfirm(prospect.id)}
						disabled={isProcessing}
					>
						{isProcessing ? "Archivando..." : "Archivar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
