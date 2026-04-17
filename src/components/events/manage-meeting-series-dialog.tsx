"use client";

import { format, isValid as isValidDate, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	Clock,
	Edit2,
	Info,
	MapPin,
	Repeat,
	Settings,
	Trash2,
	Users,
} from "lucide-react";
import type React from "react";
import { useState, useTransition } from "react";
import DefineMeetingSeriesForm from "@/components/events/add-meeting-form";
import DeleteMeetingSeriesAlert from "@/components/events/delete-meeting-series-alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type {
	DayOfWeekType,
	DefineMeetingSeriesFormValues,
	MeetingSeries,
	MeetingSeriesType,
	MeetingTargetRoleType,
	WeekOrdinalType,
} from "@/lib/types";
import { daysOfWeek, weekOrdinals } from "@/lib/types";

interface ManageMeetingSeriesDialogProps {
	series: MeetingSeries;
	updateMeetingSeriesAction: (
		seriesId: string,
		data: DefineMeetingSeriesFormValues,
	) => Promise<{
		success: boolean;
		message: string;
		updatedSeries?: MeetingSeries;
	}>;
	deleteMeetingSeriesAction: (
		seriesId: string,
	) => Promise<{ success: boolean; message: string }>;
	seriesTypeContext: MeetingSeriesType; // Added context
	ownerGroupIdContext?: string | null; // Added context
	onDeleteSuccess?: () => void;
}

const getDayLabel = (dayId: DayOfWeekType): string => {
	const day = daysOfWeek.find((d) => d.id === dayId);
	return day ? day.label : dayId;
};

const getWeekOrdinalLabel = (ordinalId?: WeekOrdinalType): string => {
	if (!ordinalId) return "";
	const ordinal = weekOrdinals.find((o) => o.id === ordinalId);
	return ordinal ? ordinal.label : ordinalId;
};

const getTargetGroupLabel = (groupKey: MeetingTargetRoleType): string => {
	switch (groupKey) {
		case "allMembers":
			return "Todos";
		case "workers":
			return "Obreros";
		case "leaders":
			return "Líderes";
		default:
			return groupKey;
	}
};

export default function ManageMeetingSeriesDialog({
	series,
	updateMeetingSeriesAction,
	deleteMeetingSeriesAction,
	seriesTypeContext,
	ownerGroupIdContext,
	onDeleteSuccess,
}: ManageMeetingSeriesDialogProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [_isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	const handleEditSuccess = () => {
		setIsEditing(false);
	};

	const handleDeleteSuccess = () => {
		setIsDeleteAlertOpen(false);
		setIsDialogOpen(false);
		if (onDeleteSuccess) {
			onDeleteSuccess();
		}
	};

	const parsedOneTimeDate =
		series.oneTimeDate &&
		typeof series.oneTimeDate === "string" &&
		series.oneTimeDate.trim() !== ""
			? parseISO(series.oneTimeDate)
			: undefined;

	const initialFormValues: DefineMeetingSeriesFormValues = {
		name: series.name,
		description: series.description || "",
		defaultTime: series.defaultTime || "09:00",
		defaultLocation: series.defaultLocation || "",
		seriesType: series.seriesType || "general",
		ownerGroupId: series.ownerGroupId,
		targetAttendeeGroups:
			seriesTypeContext !== "general"
				? ["allMembers"]
				: series.targetAttendeeGroups || [],
		frequency: series.frequency,
		oneTimeDate:
			parsedOneTimeDate && isValidDate(parsedOneTimeDate)
				? parsedOneTimeDate
				: undefined,
		weeklyDays: series.weeklyDays || [],
		monthlyRuleType: series.monthlyRuleType,
		monthlyDayOfMonth: series.monthlyDayOfMonth,
		monthlyWeekOrdinal: series.monthlyWeekOrdinal,
		monthlyDayOfWeek: series.monthlyDayOfWeek,
	};

	const handleSubmitUpdate = (data: DefineMeetingSeriesFormValues) => {
		startTransition(async () => {
			const dataToSend = {
				...data,
				oneTimeDate:
					data.oneTimeDate && isValidDate(data.oneTimeDate)
						? format(data.oneTimeDate, "yyyy-MM-dd")
						: undefined,
				seriesType: seriesTypeContext, // Ensure context is passed
				ownerGroupId: ownerGroupIdContext, // Ensure context is passed
				targetAttendeeGroups:
					seriesTypeContext !== "general"
						? ["allMembers"]
						: data.targetAttendeeGroups, // Override for group series
			};
			const result = await updateMeetingSeriesAction(
				series.id,
				dataToSend as any,
			);
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
	};

	const renderFrequencyDetails = () => {
		if (series.frequency === "OneTime" && series.oneTimeDate) {
			const parsedDate = parseISO(series.oneTimeDate);
			if (isValidDate(parsedDate)) {
				return `Única Vez: ${format(parsedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}`;
			}
			return `Única Vez: Fecha inválida (${series.oneTimeDate})`;
		}
		if (
			series.frequency === "Weekly" &&
			series.weeklyDays &&
			series.weeklyDays.length > 0
		) {
			return `Semanal: ${series.weeklyDays.map((day) => getDayLabel(day)).join(", ")}`;
		}
		if (series.frequency === "Monthly") {
			if (series.monthlyRuleType === "DayOfMonth" && series.monthlyDayOfMonth) {
				return `Mensual: El día ${series.monthlyDayOfMonth} de cada mes`;
			}
			if (
				series.monthlyRuleType === "DayOfWeekOfMonth" &&
				series.monthlyWeekOrdinal &&
				series.monthlyDayOfWeek
			) {
				return `Mensual: ${getWeekOrdinalLabel(series.monthlyWeekOrdinal)} ${getDayLabel(series.monthlyDayOfWeek)} de cada mes`;
			}
			return "Mensual (Regla no especificada completamente)";
		}
		return series.frequency;
	};

	return (
		<Dialog
			open={isDialogOpen}
			onOpenChange={(open) => {
				setIsDialogOpen(open);
				if (!open) setIsEditing(false);
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Settings className="mr-1.5 h-3.5 w-3.5" /> Gestionar Serie
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
				<DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
					<DialogTitle>
						{isEditing
							? `Editando Serie: ${series.name}`
							: `Gestionar Serie: ${series.name}`}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Modifique los detalles de esta serie de reuniones."
							: "Vea los detalles de la serie o elija editarla o eliminarla."}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-grow overflow-y-auto p-6">
					{isEditing ? (
						<DefineMeetingSeriesForm
							defineMeetingSeriesAction={handleSubmitUpdate as any}
							initialValues={initialFormValues}
							isEditing={true}
							onCancelEdit={() => setIsEditing(false)}
							seriesTypeContext={seriesTypeContext} // Pass context
							ownerGroupIdContext={ownerGroupIdContext} // Pass context
						/>
					) : (
						<div className="space-y-3 text-sm">
							<InfoItem
								icon={Info}
								label="Nombre de la Serie:"
								value={series.name}
							/>
							<InfoItem
								icon={Info}
								label="Descripción:"
								value={series.description || "N/A"}
							/>
							<InfoItem
								icon={Clock}
								label="Hora Predeterminada:"
								value={series.defaultTime || "N/A"}
							/>
							<InfoItem
								icon={MapPin}
								label="Lugar Predeterminado:"
								value={series.defaultLocation || "N/A"}
							/>
							<InfoItem
								icon={Repeat}
								label="Frecuencia:"
								value={renderFrequencyDetails()}
							/>
							{series.seriesType === "general" && (
								<InfoItem
									icon={Users}
									label="Grupos Objetivo:"
									value={
										(series.targetAttendeeGroups || [])
											.map((group) => getTargetGroupLabel(group))
											.join(", ") || "N/A"
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
								<Edit2 className="mr-2 h-4 w-4" /> Editar Detalles
							</Button>
							<DeleteMeetingSeriesAlert
								seriesId={series.id}
								seriesName={series.name}
								deleteMeetingSeriesAction={deleteMeetingSeriesAction}
								onOpenChange={setIsDeleteAlertOpen}
								onSuccess={handleDeleteSuccess}
								triggerButton={
									<Button variant="destructive" disabled={isPending}>
										<Trash2 className="mr-2 h-4 w-4" /> Eliminar Serie
									</Button>
								}
							/>
						</div>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
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
