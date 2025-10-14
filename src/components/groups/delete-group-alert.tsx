"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
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
import { useToast } from "@/hooks/use-toast";

interface DeleteGroupAlertProps {
	groupName: string;
	groupTypeLabel: "GDI" | "Área Ministerial";
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirmDelete: () => Promise<{ success: boolean; message: string }>;
}

export default function DeleteGroupAlert({
	groupName,
	groupTypeLabel,
	isOpen,
	onOpenChange,
	onConfirmDelete,
}: DeleteGroupAlertProps) {
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	const handleDelete = () => {
		startTransition(async () => {
			const result = await onConfirmDelete();
			if (result.success) {
				toast({
					title: `${groupTypeLabel} Eliminado(a)`,
					description: result.message,
				});
				onOpenChange(false); // Close the dialog on success
			} else {
				toast({
					title: "Error",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						¿Está seguro de que desea eliminar el {groupTypeLabel.toLowerCase()}{" "}
						&quot;{groupName}&quot;?
					</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará permanentemente el{" "}
						{groupTypeLabel.toLowerCase()} y se desasignarán todos sus miembros.
						Cualquier serie de reuniones, instancias y registros de asistencia
						asociados a este {groupTypeLabel.toLowerCase()} también serán
						eliminados.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						disabled={isPending}
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isPending}
						className="bg-destructive hover:bg-destructive/90"
					>
						{isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="mr-2 h-4 w-4" />
						)}
						{isPending
							? "Eliminando..."
							: `Sí, eliminar ${groupTypeLabel.toLowerCase()}`}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
