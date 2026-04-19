"use client";

import { Plus, PlusCircle } from "lucide-react";
import { useState } from "react";
import DefineMeetingSeriesForm from "@/components/events/add-meeting-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type {
	DefineMeetingSeriesFormValues,
	Meeting,
	MeetingSeries,
	MeetingSeriesType,
} from "@/lib/types";

interface PageSpecificAddMeetingDialogProps {
	defineMeetingSeriesAction: (
		data: DefineMeetingSeriesFormValues,
	) => Promise<{
		success: boolean;
		message: string;
		newSeries?: MeetingSeries;
		newInstances?: Meeting[];
	}>;
	seriesTypeContext: MeetingSeriesType;
	ownerGroupIdContext?: string | null;
	onSeriesDefined?: (newSeriesId?: string) => void; // Callback to notify parent about new series
	compact?: boolean; // Use a smaller trigger button
}

export default function PageSpecificAddMeetingDialog({
	defineMeetingSeriesAction,
	seriesTypeContext,
	ownerGroupIdContext,
	onSeriesDefined,
	compact = false,
}: PageSpecificAddMeetingDialogProps) {
	const [open, setOpen] = useState(false);

	const handleSuccess = (result: {
		success: boolean;
		message: string;
		newSeries?: MeetingSeries;
		newInstances?: Meeting[];
	}) => {
		setOpen(false);
		if (result.success && result.newSeries?.id && onSeriesDefined) {
			onSeriesDefined(result.newSeries.id);
		} else if (result.success && onSeriesDefined) {
			onSeriesDefined(); // Call even if no specific ID, to trigger general refresh if needed
		}
	};

	const handleSubmitAction = async (data: DefineMeetingSeriesFormValues) => {
		const result = await defineMeetingSeriesAction(data);
		if (result.success) {
			handleSuccess(result);
		}
		return result; // Return result for form's internal handling (e.g. toast)
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{compact ? (
					<Button size="sm" variant="ghost" className="h-8 w-8 p-0">
						<Plus className="h-4 w-4" />
						<span className="sr-only">Nueva Serie</span>
					</Button>
				) : (
					<Button>
						<PlusCircle className="mr-2 h-4 w-4" /> Definir Nueva Serie de Reunión
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden p-0">
				<DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
					<DialogTitle>
						Definir Nueva Serie de Reunión{" "}
						{seriesTypeContext !== "general"
							? `para ${seriesTypeContext === "gdi" ? "GDI" : "Área"}`
							: ""}
					</DialogTitle>
					<DialogDescription>
						Complete los detalles para la nueva serie. Si la frecuencia es
						&quot;Única Vez&quot;, también se creará la instancia de reunión.
					</DialogDescription>
				</DialogHeader>
				<div className="flex-grow flex flex-col min-h-0">
					<DefineMeetingSeriesForm
						defineMeetingSeriesAction={handleSubmitAction}
						onSuccess={() => {
							/* Error/Success toast is handled by form, dialog close by handleSuccess */
						}}
						seriesTypeContext={seriesTypeContext}
						ownerGroupIdContext={ownerGroupIdContext}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
