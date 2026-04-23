"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { defineMeetingSeriesAction } from "@/app/(protected)/actions/eventActions";
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

export default function GlobalAddMeetingTrigger() {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleFormSuccess = () => {
		setIsDialogOpen(false);
	};

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="whitespace-nowrap">
					<PlusCircle className="mr-2 h-4 w-4" />
					Crear Reunión
				</Button>
			</DialogTrigger>
				<DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden p-0">
				<DialogHeader className="flex-shrink-0 border-b p-6 pb-4">
					<DialogTitle>Agregar Nueva Reunión Globalmente</DialogTitle>
					<DialogDescription>
						Complete los detalles para la nueva reunión.
					</DialogDescription>
				</DialogHeader>
				<div className="flex-grow flex flex-col min-h-0">
					<DefineMeetingSeriesForm
						defineMeetingSeriesAction={defineMeetingSeriesAction}
						onSuccess={handleFormSuccess}
						seriesTypeContext="general"
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
