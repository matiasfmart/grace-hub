"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	AddMemberFormValues,
	GDI,
	Member,
	MinistryArea,
} from "@/lib/types";
import { AddMemberFormSchema, NONE_GDI_OPTION_VALUE } from "@/lib/types";
import { parseApiDate } from "@/lib/utils/date";

export type AddMemberFormMode = "create" | "edit";

interface AddMemberFormProps {
	onDialogClose?: () => void;
	onSubmitMember: (data: AddMemberFormValues, memberId?: string) => void;
	initialMemberData?: Member | null;
	allGDIs: GDI[];
	allMinistryAreas: MinistryArea[];
	allMembers: Member[];
	submitButtonText: string;
	cancelButtonText: string;
	isSubmitting?: boolean;
	mode?: AddMemberFormMode;
}

export default function AddMemberForm({
	onDialogClose,
	onSubmitMember,
	initialMemberData,
	allGDIs,
	allMinistryAreas,
	allMembers,
	submitButtonText,
	cancelButtonText,
	isSubmitting = false,
	mode = "edit",
}: AddMemberFormProps) {
	const defaultValues: AddMemberFormValues = {
		firstName: initialMemberData?.firstName || "",
		lastName: initialMemberData?.lastName || "",
		email: initialMemberData?.email || "",
		phone: initialMemberData?.phone || "",
		// Convert string dates from Member to Date for the form (DatePicker needs Date)
		birthDate: parseApiDate(initialMemberData?.birthDate),
		churchJoinDate: parseApiDate(initialMemberData?.churchJoinDate),
		baptismDate: parseApiDate(initialMemberData?.baptismDate),
		attendsLifeSchool: initialMemberData?.attendsLifeSchool || false,
		attendsBibleInstitute: initialMemberData?.attendsBibleInstitute || false,
		fromAnotherChurch: initialMemberData?.fromAnotherChurch || false,
		status: initialMemberData?.status || "vigente",
		address: initialMemberData?.address || "",
		assignedGDIId:
			initialMemberData?.assignedGDIId === null
				? NONE_GDI_OPTION_VALUE
				: initialMemberData?.assignedGDIId || NONE_GDI_OPTION_VALUE,
		assignedAreaIds: initialMemberData?.assignedAreaIds || [],
	};

	const form = useForm<AddMemberFormValues>({
		resolver: zodResolver(AddMemberFormSchema),
		defaultValues: defaultValues,
	});

	useEffect(() => {
		form.reset({
			firstName: initialMemberData?.firstName || "",
			lastName: initialMemberData?.lastName || "",
			email: initialMemberData?.email || "",
			phone: initialMemberData?.phone || "",
			// Convert string dates from Member to Date for the form (DatePicker needs Date)
			birthDate: parseApiDate(initialMemberData?.birthDate),
			churchJoinDate: parseApiDate(initialMemberData?.churchJoinDate),
			baptismDate: parseApiDate(initialMemberData?.baptismDate),
			attendsLifeSchool: initialMemberData?.attendsLifeSchool || false,
			attendsBibleInstitute: initialMemberData?.attendsBibleInstitute || false,
			fromAnotherChurch: initialMemberData?.fromAnotherChurch || false,
			status: initialMemberData?.status || "vigente",
			address: initialMemberData?.address || "",
			assignedGDIId:
				initialMemberData?.assignedGDIId === null
					? NONE_GDI_OPTION_VALUE
					: initialMemberData?.assignedGDIId || NONE_GDI_OPTION_VALUE,
			assignedAreaIds: initialMemberData?.assignedAreaIds || [],
		});
	}, [initialMemberData, form]); // Removed form.reset from dependencies as it's stable

	function processSubmit(values: AddMemberFormValues) {
		const submissionValues = {
			...values,
			assignedGDIId:
				values.assignedGDIId === NONE_GDI_OPTION_VALUE || !values.assignedGDIId
					? null
					: values.assignedGDIId,
		};
		onSubmitMember(submissionValues, initialMemberData?.id); // Changed initialMemberData?.id to initialMemberData?._id

		if (!initialMemberData && !onDialogClose) {
			form.reset({
				firstName: "",
				lastName: "",
				email: "",
				phone: "",
				birthDate: undefined,
				churchJoinDate: undefined,
				baptismDate: undefined,
				attendsLifeSchool: false,
				attendsBibleInstitute: false,
				fromAnotherChurch: false,
				status: "vigente",
				address: "",
				assignedGDIId: NONE_GDI_OPTION_VALUE,
				assignedAreaIds: [],
			});
		}
	}

	const handleCancel = () => {
		form.reset(defaultValues);
		if (onDialogClose) {
			onDialogClose();
		}
	};

	const memberNameMap = useMemo(() => {
		const map = new Map<string, string>();
		if (allMembers && Array.isArray(allMembers)) {
			for (const member of allMembers) {
				map.set(member.id, `${member.firstName} ${member.lastName}`);
			}
		}
		return map;
	}, [allMembers]);

	const getMemberName = (memberId: string | undefined | null): string => {
		if (!memberId) return "N/A";
		return memberNameMap.get(memberId) || "Nombre no encontrado";
	};

	// Opciones para el Combobox de GDI (buscable por nombre de GDI o guía)
	const gdiOptions = useMemo(() => {
		const noneOption = { value: NONE_GDI_OPTION_VALUE, label: "Ninguno" };
		const gdiList = allGDIs.map((gdi) => ({
			value: gdi.id,
			label: `${gdi.name} — Guía: ${
				gdi.guideId ? (memberNameMap.get(gdi.guideId) ?? "N/A") : "N/A"
			}`,
		}));
		return [noneOption, ...gdiList];
	}, [allGDIs, memberNameMap]);

	// Observar el campo GDI para mostrar advertencia RN-001 en modo alta
	const watchedGDIId = useWatch({ control: form.control, name: "assignedGDIId" });
	const showGdiWarning =
		mode === "create" &&
		(watchedGDIId === NONE_GDI_OPTION_VALUE || !watchedGDIId);

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(processSubmit)}
				className="space-y-6 p-1 sm:p-6"
			>
				{/* Sección 1 — Datos personales */}
				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="firstName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nombre</FormLabel>
									<FormControl>
										<Input
											placeholder="Juan"
											className="text-sm max-w-full"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="lastName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Apellido</FormLabel>
									<FormControl>
										<Input
											placeholder="Pérez"
											className="text-sm max-w-full"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Contacto (Teléfono)</FormLabel>
									<FormControl>
										<Input
											type="tel"
											placeholder="555-1234"
											className="text-sm max-w-full"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="ejemplo@email.com"
											className="text-sm max-w-full"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				{/* Sección 2 — Asignación de grupo (GDI) */}
				<div className="space-y-2">
					<FormField
						control={form.control}
						name="assignedGDIId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Asignar a GDI
									{mode === "create" && (
										<span className="ml-1 text-xs text-muted-foreground font-normal">
											(requerido por RN-001)
										</span>
									)}
								</FormLabel>
								<FormControl>
									<Combobox
										options={gdiOptions}
										value={field.value || NONE_GDI_OPTION_VALUE}
										onChange={field.onChange}
										placeholder="Seleccionar un GDI"
										searchPlaceholder="Buscar GDI por nombre o guía..."
										emptyStateMessage="No se encontraron GDIs con ese término."
									/>
								</FormControl>
								<FormMessage />
								{showGdiWarning && (
									<div className="flex items-start gap-2 mt-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800">
										<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
										<p className="text-xs text-amber-700 dark:text-amber-300">
											Sin GDI asignado: este miembro quedará como{" "}
											<strong>No integrado</strong>. Podés asignarlo después
											desde la vista del grupo.
										</p>
									</div>
								)}
							</FormItem>
						)}
					/>
				</div>

				{/* Sección 3 — Estado (solo en modo edición) */}
				{mode === "edit" && (
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Estado</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Seleccionar estado del miembro" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="vigente">Vigente</SelectItem>
										<SelectItem value="eliminado">Eliminado</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{/* Sección 4 — Participación */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
					<FormField
						key="attendsLifeSchool"
						control={form.control}
						name="attendsLifeSchool"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel className="font-normal mb-0!">
									¿Asiste a Escuela de Vida?
								</FormLabel>
							</FormItem>
						)}
					/>
					<FormField
						key="attendsBibleInstitute"
						control={form.control}
						name="attendsBibleInstitute"
						render={({ field }) => (
							<FormItem
								key="attendsBibleInstitute-item"
								className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm"
							>
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel className="font-normal mb-0!">
									¿Asiste al Instituto Bíblico (IBE)?
								</FormLabel>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="fromAnotherChurch"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm md:col-span-2">
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel className="font-normal mb-0!">
									¿Vino de otra iglesia?
								</FormLabel>
							</FormItem>
						)}
					/>
				</div>

				{/* Sección 5 — Datos adicionales */}
				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="birthDate"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Fecha de Nacimiento</FormLabel>
									<DatePicker
										date={field.value}
										setDate={field.onChange}
										placeholder="Seleccionar"
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="churchJoinDate"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Fecha de Ingreso a la Iglesia</FormLabel>
									<DatePicker
										date={field.value}
										setDate={field.onChange}
										placeholder="Seleccionar"
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="baptismDate"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Fecha de Bautismo</FormLabel>
									<DatePicker
										date={field.value}
										setDate={field.onChange}
										placeholder="Seleccionar"
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Dirección (Opcional)</FormLabel>
									<FormControl>
										<Input
											type="text"
											placeholder="Calle, número, ciudad..."
											className="text-sm max-w-full"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Asignar a Áreas de Ministerio</Label>
						<FormField
							control={form.control}
							name="assignedAreaIds"
							render={() => (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-md max-h-48 overflow-y-auto">
									{allMinistryAreas.map((area) => (
										<FormField
											key={area.id}
											control={form.control}
											name="assignedAreaIds"
											render={({ field }) => {
												return (
													<FormItem
														key={area.id}
														className="flex flex-row items-start space-x-3 space-y-0"
													>
														<FormControl>
															<Checkbox
																checked={field.value?.includes(area.id)}
																onCheckedChange={(checked) => {
																	return checked
																		? field.onChange([
																				...(field.value || []),
																				area.id,
																			])
																		: field.onChange(
																				field.value?.filter(
																					(value) => value !== area.id,
																				),
																			);
																}}
															/>
														</FormControl>
														<FormLabel className="font-normal">
															{area.name} (Líder: {getMemberName(area.leaderId)}
															)
														</FormLabel>
													</FormItem>
												);
											}}
										/>
									))}
								</div>
							)}
						/>
						<FormMessage>
							{form.formState.errors.assignedAreaIds?.message}
						</FormMessage>
					</div>
				</div>

				<div className="flex justify-end space-x-2 pt-6 border-t mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={isSubmitting}
					>
						{cancelButtonText}
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Guardando..." : submitButtonText}
					</Button>
				</div>
			</form>
		</Form>
	);
}
