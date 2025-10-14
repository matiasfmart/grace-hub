"use client";

import { PlusSquare } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type {
	AddOccasionalMeetingFormValues,
	Meeting,
	MeetingSeries,
} from "@/lib/types";
import MeetingInstanceForm from "./add-occasional-meeting-form";

interface AddOccasionalMeetingDialogProps {
	series: MeetingSeries;
	addOccasionalMeetingAction: (
		seriesId: string,
		formData: AddOccasionalMeetingFormValues,
	) => Promise<{ success: boolean; message: string; newInstance?: Meeting }>;
	onSuccess?: () => void;
}

export default function AddOccasionalMeetingDialog({
	series,
	addOccasionalMeetingAction,
	onSuccess,
}: AddOccasionalMeetingDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	const initialFormValues = useMemo(() => {
		let time = "00:00";
		if (
			series.defaultTime &&
			/^[0-2][0-9]:[0-5][0-9]$/.test(series.defaultTime)
		) {
			time = series.defaultTime;
		}

		return {
			name: `${series.name} (Ocasional)`,
			date: new Date(),
			time: time,
			location: series.defaultLocation,
			description: series.description || "",
		};
	}, [series]);

	const handleSubmit = async (values: AddOccasionalMeetingFormValues) => {
		const result: { success: boolean; message: string; newInstance?: Meeting } =
			{ success: false, message: "Error desconocido" };
		startTransition(async () => {
			const formResult = await addOccasionalMeetingAction(series.id, values);
			if (formResult.success) {
				toast({ title: "Éxito", description: formResult.message });
				setOpen(false);
				if (onSuccess) {
					onSuccess();
				}
			} else {
				toast({
					title: "Error",
					description: formResult.message,
					variant: "destructive",
				});
			}
		});
		// This is passed to a form component that doesn't actually use the return value
		// but the pattern is to return it.
		return result;
	};

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<PlusSquare className="mr-1.5 h-3.5 w-3.5" /> Programar Instancia
					Adicional
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
				<DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
					<DialogTitle>
						Programar Instancia Adicional para: {series.name}
					</DialogTitle>
					<DialogDescription>
						Complete los detalles para esta instancia específica de la reunión.
					</DialogDescription>
				</DialogHeader>
				<div className="flex-grow overflow-y-auto p-6">
					<MeetingInstanceForm
						onSubmitAction={handleSubmit}
						initialValues={initialFormValues}
						isEditing={false}
						isPending={isPending}
						onCancel={() => setOpen(false)}
						onSuccess={() => {
							/* Success logic is now handled in handleSubmit */
						}}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
