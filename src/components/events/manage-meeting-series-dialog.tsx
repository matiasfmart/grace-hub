"use client";

import { format, isValid as isValidDate, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Edit2, MapPin, Repeat, Settings, Trash2, Users } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type {
	AudienceType,
	DayOfWeekType,
	DefineMeetingSeriesFormValues,
	MeetingSeries,
	MeetingSeriesType,
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
	seriesTypeContext: MeetingSeriesType;
	ownerGroupIdContext?: string | null;
	onDeleteSuccess?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getDayLabel = (dayId: DayOfWeekType): string =>
	daysOfWeek.find((d) => d.id === dayId)?.label ?? dayId;

const getWeekOrdinalLabel = (ordinalId?: WeekOrdinalType): string =>
	ordinalId ? (weekOrdinals.find((o) => o.id === ordinalId)?.label ?? ordinalId) : "";

const getAudienceTypeLabel = (audienceType: AudienceType): string => {
	const labels: Record<AudienceType, string> = {
		all_active: "Todos los activos",
		integrated: "Integrados (nivel GDI+)",
		workers: "Obreros (nivel Área+)",
		leaders: "Líderes (Guías y Líderes de Área+)",
		mentors: "Mentores",
		gdi: "GDI específico",
		area: "Área ministerial",
		by_categories: "Por categorías personalizadas",
	};
	return labels[audienceType] ?? audienceType;
};

// ── Component ─────────────────────────────────────────────────────────────────

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
	const [currentSeries, setCurrentSeries] = useState<MeetingSeries>(series);
	const [, startTransition] = useTransition();
	const { toast } = useToast();

	useEffect(() => {
		setCurrentSeries(series);
	}, [series]);

	const initialFormValues = useMemo<DefineMeetingSeriesFormValues>(() => {
		const parsedOneTimeDate =
			currentSeries.oneTimeDate &&
			typeof currentSeries.oneTimeDate === "string" &&
			currentSeries.oneTimeDate.trim() !== ""
				? parseISO(currentSeries.oneTimeDate)
				: undefined;

		return {
			name: currentSeries.name,
			description: currentSeries.description || "",
			defaultTime: currentSeries.defaultTime || "09:00",
			defaultLocation: currentSeries.defaultLocation || "",
			audienceType: currentSeries.audienceType || "all_active",
			audienceConfig: currentSeries.audienceConfig || undefined,
			seriesType: currentSeries.seriesType || "general",
			ownerGroupId: currentSeries.ownerGroupId,
			targetAttendeeGroups:
				seriesTypeContext !== "general"
					? ["allMembers"]
					: currentSeries.targetAttendeeGroups || [],
			frequency: currentSeries.frequency,
			oneTimeDate:
				parsedOneTimeDate && isValidDate(parsedOneTimeDate)
					? parsedOneTimeDate
					: undefined,
			weeklyDays: currentSeries.weeklyDays || [],
			monthlyRuleType: currentSeries.monthlyRuleType,
			monthlyDayOfMonth: currentSeries.monthlyDayOfMonth,
			monthlyWeekOrdinal: currentSeries.monthlyWeekOrdinal,
			monthlyDayOfWeek: currentSeries.monthlyDayOfWeek,
		};
	}, [currentSeries, seriesTypeContext]);

	const handleSubmitUpdate = (data: DefineMeetingSeriesFormValues) => {
		startTransition(async () => {
			const dataToSend = {
				...data,
				oneTimeDate:
					data.oneTimeDate && isValidDate(data.oneTimeDate)
						? format(data.oneTimeDate, "yyyy-MM-dd")
						: undefined,
				seriesType: seriesTypeContext,
				ownerGroupId: ownerGroupIdContext,
				targetAttendeeGroups:
					seriesTypeContext !== "general"
						? ["allMembers"]
						: data.targetAttendeeGroups,
			};
			const result = await updateMeetingSeriesAction(
				currentSeries.id,
				dataToSend as any,
			);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				if (result.updatedSeries) setCurrentSeries(result.updatedSeries);
				setIsEditing(false);
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const handleDeleteSuccess = () => {
		setIsDialogOpen(false);
		onDeleteSuccess?.();
	};

	const renderFrequencyDetails = (): string => {
		const s = currentSeries;
		if (s.frequency === "OneTime" && s.oneTimeDate) {
			const parsed = parseISO(s.oneTimeDate);
			return isValidDate(parsed)
				? `Única Vez: ${format(parsed, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}`
				: `Única Vez: Fecha inválida (${s.oneTimeDate})`;
		}
		if (s.frequency === "Weekly" && s.weeklyDays?.length) {
			return `Semanal: ${s.weeklyDays.map(getDayLabel).join(", ")}`;
		}
		if (s.frequency === "Monthly") {
			if (s.monthlyRuleType === "DayOfMonth" && s.monthlyDayOfMonth) {
				return `Mensual: El día ${s.monthlyDayOfMonth} de cada mes`;
			}
			if (
				s.monthlyRuleType === "DayOfWeekOfMonth" &&
				s.monthlyWeekOrdinal &&
				s.monthlyDayOfWeek
			) {
				return `Mensual: ${getWeekOrdinalLabel(s.monthlyWeekOrdinal)} ${getDayLabel(s.monthlyDayOfWeek)} de cada mes`;
			}
			return "Mensual (regla no especificada completamente)";
		}
		return s.frequency;
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

			<DialogContent className="sm:max-w-xl flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden p-0">
				{/* Header */}
				<DialogHeader className="flex-shrink-0 border-b p-6 pb-4">
					<DialogTitle>
						{isEditing
							? `Editando: ${currentSeries.name}`
							: `Gestionar Serie: ${currentSeries.name}`}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Modifique los detalles de esta serie de reuniones."
							: "Vea los detalles de la serie o elija editarla o eliminarla."}
					</DialogDescription>
				</DialogHeader>

				{/* Body */}
				{isEditing ? (
					<div className="flex-grow flex flex-col min-h-0">
						<DefineMeetingSeriesForm
							defineMeetingSeriesAction={handleSubmitUpdate as any}
							initialValues={initialFormValues}
							isEditing={true}
							onCancelEdit={() => setIsEditing(false)}
							seriesTypeContext={seriesTypeContext}
							ownerGroupIdContext={ownerGroupIdContext}
						/>
					</div>
				) : (
					<div className="flex-grow overflow-y-auto p-6 space-y-5">
						{/* Nombre y descripción */}
						<div>
							<h3 className="text-base font-semibold">{currentSeries.name}</h3>
							{currentSeries.description ? (
								<p className="mt-1 text-sm text-muted-foreground">
									{currentSeries.description}
								</p>
							) : (
								<p className="mt-1 text-sm italic text-muted-foreground/60">
									Sin descripción
								</p>
							)}
						</div>

						<Separator />

						{/* Logística */}
						<div className="space-y-2">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Logística
							</p>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3">
									<Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
									<div>
										<p className="text-xs text-muted-foreground">Hora</p>
										<p className="text-sm font-medium">
											{currentSeries.defaultTime || "—"}
										</p>
									</div>
								</div>
								<div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3">
									<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
									<div>
										<p className="text-xs text-muted-foreground">Lugar</p>
										<p className="text-sm font-medium">
											{currentSeries.defaultLocation || "—"}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Programación */}
						<div className="space-y-2">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Programación
							</p>
							<div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3">
								<Repeat className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
								<div>
									<p className="text-xs text-muted-foreground">Frecuencia</p>
									<p className="text-sm font-medium">{renderFrequencyDetails()}</p>
								</div>
							</div>
						</div>

						{/* Audiencia */}
						<div className="space-y-2">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Audiencia
							</p>
							<div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3">
								<Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
								<div>
									<p className="text-xs text-muted-foreground">Asistentes esperados</p>
									<p className="text-sm font-medium">
										{getAudienceTypeLabel(currentSeries.audienceType)}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Footer (solo en view mode) */}
				{!isEditing && (
					<DialogFooter className="flex-shrink-0 border-t p-6 pt-4">
						<div className="flex w-full justify-between">
							<Button variant="outline" onClick={() => setIsEditing(true)}>
								<Edit2 className="mr-2 h-4 w-4" /> Editar Detalles
							</Button>
							<DeleteMeetingSeriesAlert
								seriesId={currentSeries.id}
								seriesName={currentSeries.name}
								deleteMeetingSeriesAction={deleteMeetingSeriesAction}
								onSuccess={handleDeleteSuccess}
								triggerButton={
									<Button variant="destructive">
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
