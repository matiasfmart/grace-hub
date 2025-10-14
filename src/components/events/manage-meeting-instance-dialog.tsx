"use client";

import { format, isValid as isValidDateFn, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	CalendarDays,
	Clock,
	Edit2,
	FileText,
	MapPin,
	Settings,
	Trash2,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useTransition } from "react";
import MeetingInstanceForm from "@/components/events/add-occasional-meeting-form";
import DeleteMeetingInstanceAlert from "@/components/events/delete-meeting-instance-alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type {
	Meeting,
	MeetingInstanceFormValues,
	MeetingSeries,
} from "@/lib/types";

interface ManageMeetingInstanceDialogProps {
	instance: Meeting;
	series?: MeetingSeries | null;
	updateInstanceAction: (
		instanceId: string,
		data: MeetingInstanceFormValues,
	) => Promise<{
		success: boolean;
		message: string;
		updatedInstance?: Meeting;
	}>;
	deleteInstanceAction: (
		instanceId: string,
	) => Promise<{ success: boolean; message: string }>;
	triggerButton?: React.ReactNode;
	redirectOnDeletePath?: string;
}

export default function ManageMeetingInstanceDialog({
	instance,
	series,
	updateInstanceAction,
	deleteInstanceAction,
	triggerButton,
	redirectOnDeletePath,
}: ManageMeetingInstanceDialogProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();
	const router = useRouter();

	const handleEditSuccess = () => {
		setIsEditing(false);
	};

	const handleDeleteConfirm = async () => {
		const result = await deleteInstanceAction(instance.id);
		if (result.success) {
			setIsDeleteAlertOpen(false);
			setIsDialogOpen(false);
			toast({
				title: "Instancia Eliminada",
				description: result.message,
			});
			router.push(redirectOnDeletePath || "/events");
		}
		return result;
	};

	const parsedDate = useMemo(() => {
		if (instance.date && typeof instance.date === "string") {
			const d = parseISO(instance.date);
			return isValidDateFn(d) ? d : undefined;
		}
		return undefined;
	}, [instance.date]);

	const initialFormValues: MeetingInstanceFormValues = useMemo(
		() => ({
			name: instance.name,
			date: parsedDate || new Date(),
			time: instance.time,
			location: instance.location,
			description: instance.description || "",
		}),
		[instance, parsedDate],
	);

	const handleSubmitUpdate = async (formData: MeetingInstanceFormValues) => {
		let result: {
			success: boolean;
			message: string;
			updatedInstance?: Meeting;
		} = { success: false, message: "Error desconocido" };
		startTransition(async () => {
			result = await updateInstanceAction(instance.id, formData);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				handleEditSuccess();
			} else {
				toast({
					title: "Error",
					description: result.message,
					variant: "destructive",
				});
			}
		});
		return result;
	};

	const Trigger = triggerButton ? (
		React.cloneElement(triggerButton as React.ReactElement, {
			onClick: () => setIsDialogOpen(true),
		})
	) : (
		<Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
			<Settings className="mr-1.5 h-3.5 w-3.5" /> Gestionar Instancia
		</Button>
	);

	return (
		<>
			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					setIsDialogOpen(open);
					if (!open) setIsEditing(false);
				}}
			>
				{Trigger}
				<DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
					<DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
						<DialogTitle>
							{isEditing
								? `Editando: ${instance.name}`
								: `Gestionar: ${instance.name}`}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? "Modifique los detalles de esta instancia de reunión."
								: "Vea los detalles de la instancia o elija editarla o eliminarla."}
							{series && !isEditing && (
								<span className="block text-xs pt-1">
									De la serie: {series.name}
								</span>
							)}
						</DialogDescription>
					</DialogHeader>

					<div className="flex-grow overflow-y-auto p-6">
						{isEditing ? (
							<MeetingInstanceForm
								onSubmitAction={(formData) => handleSubmitUpdate(formData)}
								initialValues={initialFormValues}
								isEditing={true}
								isPending={isPending}
								onCancel={() => setIsEditing(false)}
								onSuccess={handleEditSuccess}
							/>
						) : (
							<div className="space-y-3 text-sm">
								<InfoItem
									icon={CalendarDays}
									label="Fecha:"
									value={
										parsedDate
											? format(parsedDate, "EEEE, d 'de' MMMM 'de' yyyy", {
													locale: es,
												})
											: "Fecha inválida"
									}
								/>
								<InfoItem icon={Clock} label="Hora:" value={instance.time} />
								<InfoItem
									icon={MapPin}
									label="Lugar:"
									value={instance.location}
								/>
								<InfoItem
									icon={FileText}
									label="Descripción:"
									value={instance.description || "N/A"}
								/>
								{instance.attendeeUids && (
									<InfoItem
										icon={Users}
										label="Asistentes Esperados (UIDs):"
										value={
											instance.attendeeUids.length > 0
												? instance.attendeeUids.join(", ")
												: "Ninguno especificado"
										}
									/>
								)}
							</div>
						)}
					</div>

					{!isEditing && (
						<DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
							<div className="flex justify-between w-full">
								<Button
									variant="outline"
									onClick={() => setIsEditing(true)}
									disabled={isPending}
								>
									<Edit2 className="mr-2 h-4 w-4" /> Editar Instancia
								</Button>
								<Button
									variant="destructive"
									onClick={() => setIsDeleteAlertOpen(true)}
									disabled={isPending}
								>
									<Trash2 className="mr-2 h-4 w-4" /> Eliminar Instancia
								</Button>
							</div>
						</DialogFooter>
					)}
				</DialogContent>
			</Dialog>
			<DeleteMeetingInstanceAlert
				instanceName={instance.name}
				isOpen={isDeleteAlertOpen}
				onOpenChange={setIsDeleteAlertOpen}
				onConfirmDelete={handleDeleteConfirm}
			/>
		</>
	);
}

const InfoItem: React.FC<{
	icon: React.ElementType;
	label: string;
	value: string;
}> = ({ icon: Icon, label, value }) => (
	<div>
		<h3 className="font-semibold text-muted-foreground flex items-center mb-0.5">
			<Icon className="mr-2 h-4 w-4" />
			{label}
		</h3>
		<p className="ml-6">{value}</p>
	</div>
);
