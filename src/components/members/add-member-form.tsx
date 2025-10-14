"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react"; // Added useMemo
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface AddMemberFormProps {
	onDialogClose?: () => void; // For dialog control
	onSubmitMember: (data: AddMemberFormValues, memberId?: string) => void; // Combined submit for add/edit
	initialMemberData?: Member | null; // For pre-filling form in edit mode
	allGDIs: GDI[];
	allMinistryAreas: MinistryArea[];
	allMembers: Member[]; // For GDI/Area leader name lookup
	submitButtonText: string;
	cancelButtonText: string;
	isSubmitting?: boolean; // To show loading state on submit button
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
}: AddMemberFormProps) {
	const defaultValues: AddMemberFormValues = {
		firstName: initialMemberData?.firstName || "",
		lastName: initialMemberData?.lastName || "",
		email: initialMemberData?.email || "",
		phone: initialMemberData?.phone || "",
		birthDate: initialMemberData?.birthDate
			? new Date(`${initialMemberData.birthDate}T00:00:00Z`)
			: undefined,
		churchJoinDate: initialMemberData?.churchJoinDate
			? new Date(`${initialMemberData.churchJoinDate}T00:00:00Z`)
			: undefined,
		baptismDate: initialMemberData?.baptismDate || "",
		attendsLifeSchool: initialMemberData?.attendsLifeSchool || false,
		attendsBibleInstitute: initialMemberData?.attendsBibleInstitute || false,
		fromAnotherChurch: initialMemberData?.fromAnotherChurch || false,
		status: initialMemberData?.status || "New",
		avatarUrl: initialMemberData?.avatarUrl || "",
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
			birthDate: initialMemberData?.birthDate
				? new Date(`${initialMemberData.birthDate}T00:00:00Z`)
				: undefined,
			churchJoinDate: initialMemberData?.churchJoinDate
				? new Date(`${initialMemberData.churchJoinDate}T00:00:00Z`)
				: undefined,
			baptismDate: initialMemberData?.baptismDate || "",
			attendsLifeSchool: initialMemberData?.attendsLifeSchool || false,
			attendsBibleInstitute: initialMemberData?.attendsBibleInstitute || false,
			fromAnotherChurch: initialMemberData?.fromAnotherChurch || false,
			status: initialMemberData?.status || "New",
			avatarUrl: initialMemberData?.avatarUrl || "",
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
				values.assignedGDIId === NONE_GDI_OPTION_VALUE
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
				baptismDate: "",
				attendsLifeSchool: false,
				attendsBibleInstitute: false,
				fromAnotherChurch: false,
				status: "New",
				avatarUrl: "",
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

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(processSubmit)}
				className="space-y-6 p-1 sm:p-6"
			>
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
								<FormItem>
									<FormLabel>Fecha de Bautismo</FormLabel>
									<FormControl>
										<Input
											placeholder="ej: 2023-06-15"
											className="text-sm max-w-full"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Día y mes (Junio 15), mes y año (Junio 2023), o fecha
										completa (2023-06-15).
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
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
											<SelectItem value="New">Nuevo</SelectItem>
											<SelectItem value="Active">Activo</SelectItem>
											<SelectItem value="Inactive">Inactivo</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="avatarUrl"
							render={({ field }) => (
								<FormItem className="md:col-span-2">
									<FormLabel>URL del Avatar (Opcional)</FormLabel>
									<FormControl>
										<Input
											type="url"
											placeholder="https://avatar.com/img.png"
											className="text-sm max-w-full"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 pt-2">
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

					<FormField
						control={form.control}
						name="assignedGDIId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Asignar a GDI</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value || NONE_GDI_OPTION_VALUE}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Seleccionar un GDI" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value={NONE_GDI_OPTION_VALUE}>
											Ninguno
										</SelectItem>
										{allGDIs.map((gdi) => (
											<SelectItem key={gdi.id} value={gdi.id}>
												{gdi.name} (Guía: {getMemberName(gdi.guideId)})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

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
