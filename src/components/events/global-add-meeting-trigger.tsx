"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { defineMeetingSeriesAction } from "@/app/actions/eventActions";
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
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Agregar Nueva Reunión Globalmente</DialogTitle>
					<DialogDescription>
						Complete los detalles para la nueva reunión.
					</DialogDescription>
				</DialogHeader>
				<DefineMeetingSeriesForm
					defineMeetingSeriesAction={defineMeetingSeriesAction}
					onSuccess={handleFormSuccess}
					seriesTypeContext="general"
				/>
			</DialogContent>
		</Dialog>
	);
}
