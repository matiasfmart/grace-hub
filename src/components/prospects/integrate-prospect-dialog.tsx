"use client";

import { useState, useTransition } from "react";
import type { GDI, Prospect } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface IntegrateProspectDialogProps {
	prospect: Prospect | null;
	allGDIs: GDI[];
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (prospectId: string, gdiId?: string) => void;
	isProcessing: boolean;
}

export default function IntegrateProspectDialog({
	prospect,
	allGDIs,
	isOpen,
	onClose,
	onConfirm,
	isProcessing,
}: IntegrateProspectDialogProps) {
	const [selectedGdiId, setSelectedGdiId] = useState<string>("");

	const handleConfirm = () => {
		if (!prospect) return;
		onConfirm(prospect.id, selectedGdiId === "none" || !selectedGdiId ? undefined : selectedGdiId);
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setSelectedGdiId("");
			onClose();
		}
	};

	if (!prospect) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						Integrar a {prospect.firstName} {prospect.lastName}
					</DialogTitle>
					<DialogDescription>
						Al confirmar se creará el miembro como Vigente y quedará registrado
						el historial de la visita. La fecha de ingreso del miembro será la
						fecha de visita:{" "}
						<strong>
							{new Date(prospect.visitDate + "T00:00:00").toLocaleDateString(
								"es-ES",
								{ weekday: "short", day: "numeric", month: "long", year: "numeric" },
							)}
						</strong>
						.
					</DialogDescription>
				</DialogHeader>

				<div className="py-2">
					<Label htmlFor="gdi-select" className="text-sm font-medium">
						Asignar a GDI{" "}
						<span className="text-muted-foreground font-normal">(opcional)</span>
					</Label>
					<Select
						value={selectedGdiId}
						onValueChange={setSelectedGdiId}
					>
						<SelectTrigger id="gdi-select" className="mt-1.5">
							<SelectValue placeholder="Sin asignar" />
						</SelectTrigger>
						<SelectContent>
						<SelectItem value="none">Sin asignar</SelectItem>
							{allGDIs.map((gdi) => (
								<SelectItem key={gdi.id} value={gdi.id}>
									{gdi.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isProcessing}>
						Cancelar
					</Button>
					<Button onClick={handleConfirm} disabled={isProcessing}>
						{isProcessing ? "Procesando..." : "Confirmar integración"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
