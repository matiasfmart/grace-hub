"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid, parseISO } from "date-fns";
import {
	Calendar,
	CalendarRange,
	Clock,
	Loader2,
	MapPin,
	Repeat,
	Tag,
	Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { roleTypesService } from "@/lib/api/services";
import type { RoleType } from "@/lib/api/mappers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { DialogClose } from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
	AudienceType,
	DayOfWeekType,
	DefineMeetingSeriesFormValues,
	MeetingFrequencyType,
	MeetingSeries,
	MeetingSeriesType,
	WeekOrdinalType,
} from "@/lib/types";
import {
	DefineMeetingSeriesFormSchema,
	daysOfWeek,
	weekOrdinals,
} from "@/lib/types";

// ── Module-level constants (no recreating on every render) ─────────────────

const AUDIENCE_TYPE_OPTIONS: {
	value: AudienceType;
	label: string;
	description: string;
}[] = [
	{ value: "all_active", label: "Todos los Miembros", description: "Todos los miembros activos" },
	{ value: "integrated", label: "Integrados", description: "Nivel operativo ≥ 1 (en GDI o Área)" },
	{ value: "workers", label: "Obreros", description: "Nivel operativo ≥ 2 (en Área)" },
	{ value: "leaders", label: "Líderes", description: "Nivel operativo ≥ 3 (Guías y Líderes)" },
	{ value: "mentors", label: "Mentores", description: "Nivel operativo = 4 (Mentores)" },
	{ value: "by_categories", label: "Por Etiqueta Eclesiástica", description: "Pastor, Diácono, Anciano, etc." },
];

const FREQUENCY_OPTIONS: {
	value: MeetingFrequencyType;
	label: string;
	icon: React.ElementType;
}[] = [
	{ value: "OneTime", label: "Única Vez", icon: Calendar },
	{ value: "Weekly", label: "Semanal", icon: Repeat },
	{ value: "Monthly", label: "Mensual", icon: CalendarRange },
];

// ── Section header helper ────────────────────────────────────────────────────
const SectionHeader = ({
	icon: Icon,
	title,
}: {
	icon: React.ElementType;
	title: string;
}) => (
	<div className="flex items-center gap-2 pt-1">
		<Icon className="h-4 w-4 text-primary shrink-0" />
		<span className="text-sm font-semibold text-foreground whitespace-nowrap">
			{title}
		</span>
		<Separator className="flex-1" />
	</div>
);

interface DefineMeetingSeriesFormProps {
	defineMeetingSeriesAction: (
		data: DefineMeetingSeriesFormValues,
	) => Promise<{
		success: boolean;
		message: string;
		newSeries?: any;
		newInstance?: any;
		updatedSeries?: MeetingSeries;
	}>;
	onSuccess?: () => void;
	initialValues?: DefineMeetingSeriesFormValues;
	isEditing?: boolean;
	onCancelEdit?: () => void;
	seriesTypeContext?: MeetingSeriesType;
	ownerGroupIdContext?: string | null;
}

const baseDefaultFormValues: DefineMeetingSeriesFormValues = {
	name: "",
	description: "",
	defaultTime: "10:00",
	defaultLocation: "Santuario Principal",
	audienceType: "all_active",
	audienceConfig: undefined,
	seriesType: "general",
	ownerGroupId: null,
	targetAttendeeGroups: [],
	frequency: "Weekly",
	oneTimeDate: undefined,
	weeklyDays: [],
	monthlyRuleType: undefined,
	monthlyDayOfMonth: undefined,
	monthlyWeekOrdinal: undefined,
	monthlyDayOfWeek: undefined,
};

const getResolvedDefaultValues = (
	currentInitialValues?: DefineMeetingSeriesFormValues,
	seriesTypeContext?: MeetingSeriesType,
	ownerGroupIdContext?: string | null,
): DefineMeetingSeriesFormValues => {
	let oneTimeDateToSet: Date | undefined;
	if (currentInitialValues?.oneTimeDate) {
		if (
			currentInitialValues.oneTimeDate instanceof Date &&
			isValid(currentInitialValues.oneTimeDate)
		) {
			oneTimeDateToSet = currentInitialValues.oneTimeDate;
		} else if (typeof currentInitialValues.oneTimeDate === "string") {
			const parsed = parseISO(currentInitialValues.oneTimeDate);
			if (isValid(parsed)) {
				oneTimeDateToSet = parsed;
			}
		}
	}

	// Determine default audienceType based on context
	let defaultAudienceType: AudienceType = "all_active";
	if (seriesTypeContext === "gdi") {
		defaultAudienceType = "gdi";
	} else if (seriesTypeContext === "ministryArea") {
		defaultAudienceType = "area";
	}

	const resolved: DefineMeetingSeriesFormValues = {
		...baseDefaultFormValues,
		name: currentInitialValues?.name ?? baseDefaultFormValues.name,
		description:
			currentInitialValues?.description ?? baseDefaultFormValues.description,
		defaultTime:
			currentInitialValues?.defaultTime ?? baseDefaultFormValues.defaultTime,
		defaultLocation:
			currentInitialValues?.defaultLocation ??
			baseDefaultFormValues.defaultLocation,
		audienceType:
			currentInitialValues?.audienceType ?? defaultAudienceType,
		audienceConfig:
			currentInitialValues?.audienceConfig ?? baseDefaultFormValues.audienceConfig,
		seriesType:
			currentInitialValues?.seriesType ??
			seriesTypeContext ??
			baseDefaultFormValues.seriesType,
		ownerGroupId:
			currentInitialValues?.ownerGroupId ??
			ownerGroupIdContext ??
			baseDefaultFormValues.ownerGroupId,
		targetAttendeeGroups:
			currentInitialValues?.targetAttendeeGroups ??
			baseDefaultFormValues.targetAttendeeGroups,
		frequency:
			currentInitialValues?.frequency ?? baseDefaultFormValues.frequency,
		oneTimeDate: oneTimeDateToSet,
		weeklyDays:
			currentInitialValues?.weeklyDays ?? baseDefaultFormValues.weeklyDays,
		monthlyRuleType:
			currentInitialValues?.monthlyRuleType ??
			baseDefaultFormValues.monthlyRuleType,
		monthlyDayOfMonth:
			currentInitialValues?.monthlyDayOfMonth ??
			baseDefaultFormValues.monthlyDayOfMonth,
		monthlyWeekOrdinal:
			currentInitialValues?.monthlyWeekOrdinal ??
			baseDefaultFormValues.monthlyWeekOrdinal,
		monthlyDayOfWeek:
			currentInitialValues?.monthlyDayOfWeek ??
			baseDefaultFormValues.monthlyDayOfWeek,
	};

	resolved.name = resolved.name || "";
	resolved.description = resolved.description || "";
	resolved.defaultTime = resolved.defaultTime || "00:00";
	resolved.defaultLocation = resolved.defaultLocation || "";

	return resolved;
};

export default function DefineMeetingSeriesForm({
	defineMeetingSeriesAction,
	onSuccess,
	initialValues,
	isEditing = false,
	onCancelEdit,
	seriesTypeContext = "general",
	ownerGroupIdContext = null,
}: DefineMeetingSeriesFormProps) {
	const [isPending, startTransition] = useTransition();
	const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
	const [isLoadingRoleTypes, setIsLoadingRoleTypes] = useState(false);
	const [roleTypesLoaded, setRoleTypesLoaded] = useState(false);
	const { toast } = useToast();

	const resolvedDefaultValues = useMemo(
		() =>
			getResolvedDefaultValues(
				initialValues,
				seriesTypeContext,
				ownerGroupIdContext,
			),
		[initialValues, seriesTypeContext, ownerGroupIdContext],
	);

	const form = useForm<DefineMeetingSeriesFormValues>({
		resolver: zodResolver(DefineMeetingSeriesFormSchema),
		defaultValues: resolvedDefaultValues,
	});

	useEffect(() => {
		form.reset(
			getResolvedDefaultValues(
				initialValues,
				seriesTypeContext,
				ownerGroupIdContext,
			),
		);
	}, [initialValues, form, seriesTypeContext, ownerGroupIdContext]);

	const watchedFrequency = form.watch("frequency");
	const watchedMonthlyRuleType = form.watch("monthlyRuleType");
	const watchedAudienceType = form.watch("audienceType");

	// Load role types lazily, only when user selects by_categories
	useEffect(() => {
		if (watchedAudienceType === "by_categories" && !roleTypesLoaded) {
			setIsLoadingRoleTypes(true);
			roleTypesService.getAll()
				.then((data) => {
					setRoleTypes(data);
					setRoleTypesLoaded(true);
				})
				.catch((error) => {
					console.error("Error loading role types:", error);
				})
				.finally(() => setIsLoadingRoleTypes(false));
		}
	}, [watchedAudienceType, roleTypesLoaded]);

	// Clear audienceConfig when not using by_categories
	useEffect(() => {
		if (watchedAudienceType !== "by_categories") {
			form.setValue("audienceConfig", undefined, { shouldValidate: true });
		}
	}, [watchedAudienceType, form]);

	useEffect(() => {
		if (watchedFrequency !== "OneTime") {
			form.setValue("oneTimeDate", undefined, { shouldValidate: true });
		}
		if (watchedFrequency !== "Weekly") {
			form.setValue("weeklyDays", [], { shouldValidate: true });
		}
		if (watchedFrequency !== "Monthly") {
			form.setValue("monthlyRuleType", undefined, { shouldValidate: true });
			form.setValue("monthlyDayOfMonth", undefined, { shouldValidate: true });
			form.setValue("monthlyWeekOrdinal", undefined, { shouldValidate: true });
			form.setValue("monthlyDayOfWeek", undefined, { shouldValidate: true });
		}
	}, [watchedFrequency, form]);

	useEffect(() => {
		if (
			watchedFrequency === "Monthly" &&
			watchedMonthlyRuleType === "DayOfWeekOfMonth"
		) {
			form.setValue("monthlyDayOfMonth", undefined, { shouldValidate: true });
		}
		if (
			watchedFrequency === "Monthly" &&
			watchedMonthlyRuleType === "DayOfMonth"
		) {
			form.setValue("monthlyWeekOrdinal", undefined, { shouldValidate: true });
			form.setValue("monthlyDayOfWeek", undefined, { shouldValidate: true });
		}
	}, [watchedMonthlyRuleType, watchedFrequency, form]);

	const getValidatedData = () => {
		const values = form.getValues();
		if (
			values.oneTimeDate &&
			values.oneTimeDate instanceof Date &&
			isValid(values.oneTimeDate)
		) {
			values.oneTimeDate = format(values.oneTimeDate, "yyyy-MM-dd") as any;
		} else if (values.oneTimeDate && typeof values.oneTimeDate === "string") {
			// Assume formatted or let Zod handle
		} else {
			values.oneTimeDate = undefined;
		}

		values.seriesType = seriesTypeContext;
		values.ownerGroupId = ownerGroupIdContext;
		
		// Set audienceType based on context
		if (seriesTypeContext === "gdi") {
			values.audienceType = "gdi";
		} else if (seriesTypeContext === "ministryArea") {
			values.audienceType = "area";
		}
		// For general context, keep the user-selected audienceType

		const dataToSend = { ...values };

		if (dataToSend.frequency !== "OneTime") delete dataToSend.oneTimeDate;
		if (dataToSend.frequency !== "Weekly") delete dataToSend.weeklyDays;
		if (dataToSend.frequency !== "Monthly") {
			delete dataToSend.monthlyRuleType;
			delete dataToSend.monthlyDayOfMonth;
			delete dataToSend.monthlyWeekOrdinal;
			delete dataToSend.monthlyDayOfWeek;
		} else {
			if (dataToSend.monthlyRuleType !== "DayOfMonth")
				delete dataToSend.monthlyDayOfMonth;
			if (dataToSend.monthlyRuleType !== "DayOfWeekOfMonth") {
				delete dataToSend.monthlyWeekOrdinal;
				delete dataToSend.monthlyDayOfWeek;
			}
		}
		
		// Clean up audienceConfig if not using by_categories
		if (dataToSend.audienceType !== "by_categories") {
			delete dataToSend.audienceConfig;
		}
		
		return dataToSend;
	};

	async function onSubmit() {
		const validatedData = getValidatedData();
		startTransition(async () => {
			const result = await defineMeetingSeriesAction(validatedData);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				if (onSuccess) {
					onSuccess();
				}
				if (!isEditing) {
					form.reset(
						getResolvedDefaultValues(
							undefined,
							seriesTypeContext,
							ownerGroupIdContext,
						),
					);
				}
			} else {
				toast({
					title: "Error",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	}

	const handleCancel = () => {
		if (isEditing && onCancelEdit) {
			onCancelEdit();
			form.reset(
				getResolvedDefaultValues(
					initialValues,
					seriesTypeContext,
					ownerGroupIdContext,
				),
			);
		} else {
			form.reset(
				getResolvedDefaultValues(
					undefined,
					seriesTypeContext,
					ownerGroupIdContext,
				),
			);
		}
	};

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-1 min-h-0 flex-col"
			>
				{/* Body scrollable */}
				<div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">

					{/* ── Sección: Información General ── */}
					<SectionHeader icon={Tag} title="Información General" />

					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Nombre de la Serie</FormLabel>
								<FormControl>
									<Input
										placeholder="e.g., Servicio Dominical, Estudio Bíblico"
										{...field}
										disabled={isPending}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Descripción{" "}
									<span className="text-muted-foreground font-normal">
										(opcional)
									</span>
								</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Breve descripción de esta serie de reuniones."
										{...field}
										value={field.value ?? ""}
										disabled={isPending}
										rows={2}
										className="resize-none"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* ── Sección: Logística ── */}
					<SectionHeader icon={MapPin} title="Logística" />

					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="defaultTime"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-1.5">
										<Clock className="h-3.5 w-3.5 text-muted-foreground" />
										Hora
									</FormLabel>
									<FormControl>
										<Input type="time" {...field} disabled={isPending} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="defaultLocation"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-1.5">
										<MapPin className="h-3.5 w-3.5 text-muted-foreground" />
										Lugar
									</FormLabel>
									<FormControl>
										<Input
											placeholder="Santuario Principal"
											{...field}
											disabled={isPending}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* ── Sección: Audiencia (solo para series generales) ── */}
					{seriesTypeContext === "general" && (
						<>
							<SectionHeader icon={Users} title="Asistentes Esperados" />

							<FormField
								control={form.control}
								name="audienceType"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<RadioGroup
												onValueChange={(v) =>
													field.onChange(v as AudienceType)
												}
												value={field.value}
												disabled={isPending}
												className="space-y-1"
											>
												{AUDIENCE_TYPE_OPTIONS.map((opt) => (
													<label
														key={opt.value}
														htmlFor={`audience-${opt.value}`}
														className={cn(
															"flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition-all",
															field.value === opt.value
																? "border-primary bg-primary/5 shadow-sm"
																: "border-border hover:border-primary/40 hover:bg-muted/30",
															isPending && "pointer-events-none opacity-60",
														)}
													>
														<RadioGroupItem
															id={`audience-${opt.value}`}
															value={opt.value}
														/>
														<div className="flex-1 min-w-0">
															<span className="text-sm font-medium leading-none">
																{opt.label}
															</span>
															<p className="text-xs text-muted-foreground mt-0.5 truncate">
																{opt.description}
															</p>
														</div>
													</label>
												))}
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Etiquetas eclesiásticas (solo when by_categories) */}
							{watchedAudienceType === "by_categories" && (
								<FormField
									control={form.control}
									name="audienceConfig"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Etiquetas Eclesiásticas</FormLabel>
											{isLoadingRoleTypes ? (
												<div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
													<Loader2 className="h-4 w-4 animate-spin text-primary" />
													<span className="text-sm text-muted-foreground">
														Cargando etiquetas...
													</span>
												</div>
											) : roleTypes.length === 0 ? (
												<div className="p-3 border rounded-md text-sm text-muted-foreground">
													No hay etiquetas configuradas.{" "}
													<a
														href="/members/settings/role-types"
														className="text-primary underline"
													>
														Crear etiquetas
													</a>
												</div>
											) : (
												<div className="grid grid-cols-2 gap-1.5 p-3 border rounded-md bg-muted/20">
													{roleTypes.map((roleType) => {
														const currentConfig = field.value || {
															roleTypeIds: [],
														};
														const isChecked =
															currentConfig.roleTypeIds?.includes(
																Number(roleType.id),
															) || false;
														return (
															<label
																key={roleType.id}
																htmlFor={`roleType-${roleType.id}`}
																className={cn(
																	"flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-all",
																	isChecked
																		? "border-primary bg-primary/10 text-primary font-medium"
																		: "border-border hover:border-primary/40",
																)}
															>
																<Checkbox
																	id={`roleType-${roleType.id}`}
																	checked={isChecked}
																	onCheckedChange={(checked) => {
																		const currentIds =
																			currentConfig.roleTypeIds || [];
																		const newIds = checked
																			? [...currentIds, Number(roleType.id)]
																			: currentIds.filter(
																					(id) => id !== Number(roleType.id),
																				);
																		field.onChange({
																			...currentConfig,
																			roleTypeIds: newIds,
																		});
																	}}
																	disabled={isPending}
																/>
																{roleType.name}
															</label>
														);
													})}
												</div>
											)}
											<FormDescription>
												Solo los miembros con alguna de estas etiquetas serán
												convocados
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</>
					)}

					{/* ── Sección: Programación ── */}
					<SectionHeader icon={CalendarRange} title="Programación" />

					{/* Frecuencia — toggle buttons */}
					<FormField
						control={form.control}
						name="frequency"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Frecuencia</FormLabel>
								<FormControl>
									<div className="grid grid-cols-3 gap-2">
										{FREQUENCY_OPTIONS.map(({ value, label, icon: Icon }) => (
											<button
												key={value}
												type="button"
												disabled={isPending}
												onClick={() =>
													field.onChange(value as MeetingFrequencyType)
												}
												className={cn(
													"flex flex-col items-center gap-1.5 rounded-lg border-2 py-3 px-2 text-sm font-medium transition-all",
													field.value === value
														? "border-primary bg-primary/10 text-primary shadow-sm"
														: "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
													isPending && "opacity-60 pointer-events-none",
												)}
											>
												<Icon className="h-4 w-4" />
												{label}
											</button>
										))}
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Única Vez — date picker */}
					{watchedFrequency === "OneTime" && (
						<FormField
							control={form.control}
							name="oneTimeDate"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Fecha de la Reunión</FormLabel>
									<DatePicker
										date={
											field.value instanceof Date && isValid(field.value)
												? field.value
												: undefined
										}
										setDate={field.onChange}
										placeholder="Seleccionar fecha"
										disabled={isPending}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}

					{/* Semanal — pill day selector */}
					{watchedFrequency === "Weekly" && (
						<FormField
							control={form.control}
							name="weeklyDays"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Días de la Semana</FormLabel>
									<FormControl>
										<div className="flex flex-wrap gap-1.5">
											{daysOfWeek.map((day) => {
												const isSelected = field.value?.includes(day.id);
												return (
													<button
														key={day.id}
														type="button"
														disabled={isPending}
														onClick={() => {
															const current = field.value || [];
															field.onChange(
																isSelected
																	? current.filter((d) => d !== day.id)
																	: [...current, day.id],
															);
														}}
														className={cn(
															"rounded-full border px-3 py-1 text-sm font-medium transition-all",
															isSelected
																? "border-primary bg-primary text-primary-foreground shadow-sm"
																: "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
															isPending && "opacity-60 pointer-events-none",
														)}
													>
														{day.label}
													</button>
												);
											})}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}

					{/* Mensual — regla + sub-campos */}
					{watchedFrequency === "Monthly" && (
						<div className="space-y-4 rounded-lg border bg-muted/20 p-4">
							<FormField
								control={form.control}
								name="monthlyRuleType"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<FormLabel>Regla Mensual</FormLabel>
										<FormControl>
											<RadioGroup
												onValueChange={field.onChange as (v: string) => void}
												value={field.value}
												className="flex flex-col gap-2"
												disabled={isPending}
											>
												<label
													htmlFor="rule-dayofmonth"
													className={cn(
														"flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-all",
														field.value === "DayOfMonth"
															? "border-primary bg-primary/5"
															: "border-border hover:border-primary/40",
													)}
												>
													<RadioGroupItem id="rule-dayofmonth" value="DayOfMonth" />
													<span className="text-sm">
														Día fijo del mes{" "}
														<span className="text-muted-foreground">
															(ej: el día 15)
														</span>
													</span>
												</label>
												<label
													htmlFor="rule-dayofweek"
													className={cn(
														"flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-all",
														field.value === "DayOfWeekOfMonth"
															? "border-primary bg-primary/5"
															: "border-border hover:border-primary/40",
													)}
												>
													<RadioGroupItem
														id="rule-dayofweek"
														value="DayOfWeekOfMonth"
													/>
													<span className="text-sm">
														Día de la semana en el mes{" "}
														<span className="text-muted-foreground">
															(ej: 3er Martes)
														</span>
													</span>
												</label>
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{watchedMonthlyRuleType === "DayOfMonth" && (
								<FormField
									control={form.control}
									name="monthlyDayOfMonth"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Día del Mes (1–31)</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="1"
													max="31"
													className="w-24"
													{...field}
													value={field.value || ""}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? undefined
																: parseInt(e.target.value, 10),
														)
													}
													disabled={isPending}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{watchedMonthlyRuleType === "DayOfWeekOfMonth" && (
								<div className="grid grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="monthlyWeekOrdinal"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Semana</FormLabel>
												<Select
													onValueChange={
														field.onChange as (v: WeekOrdinalType) => void
													}
													value={field.value}
													disabled={isPending}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Seleccionar" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{weekOrdinals.map((opt) => (
															<SelectItem key={opt.id} value={opt.id}>
																{opt.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="monthlyDayOfWeek"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Día</FormLabel>
												<Select
													onValueChange={
														field.onChange as (v: DayOfWeekType) => void
													}
													value={field.value}
													disabled={isPending}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Seleccionar" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{daysOfWeek.map((opt) => (
															<SelectItem key={opt.id} value={opt.id}>
																{opt.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer fijo */}
				<div className="flex-shrink-0 flex justify-end gap-2 border-t bg-background px-6 py-4">
					{onCancelEdit ? (
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={isPending}
						>
							Cancelar
						</Button>
					) : (
						<DialogClose asChild>
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={isPending}
							>
								Cancelar
							</Button>
						</DialogClose>
					)}
					<Button type="submit" disabled={isPending} className="min-w-[140px]">
						{isPending ? (
							<Loader2 className="animate-spin mr-2 h-4 w-4" />
						) : null}
						{isEditing ? "Guardar Cambios" : "Definir Serie"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
