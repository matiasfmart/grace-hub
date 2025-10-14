"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isValid, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DialogClose } from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MeetingInstanceFormValues } from "@/lib/types";
import { MeetingInstanceFormSchema } from "@/lib/types";

interface MeetingInstanceFormProps {
	onSubmitAction: (
		formData: MeetingInstanceFormValues,
	) => Promise<{
		success: boolean;
		message: string;
		newInstance?: any;
		updatedInstance?: any;
	}>;
	onSuccess?: () => void;
	initialValues?: Partial<MeetingInstanceFormValues>;
	isEditing?: boolean;
	isPending?: boolean;
	onCancel?: () => void;
}

export default function MeetingInstanceForm({
	onSubmitAction,
	onSuccess,
	initialValues,
	isEditing = false,
	isPending = false,
	onCancel,
}: MeetingInstanceFormProps) {
	const computedDefaultValues: MeetingInstanceFormValues = useMemo(
		() => ({
			name: initialValues?.name || "",
			date:
				initialValues?.date instanceof Date && isValid(initialValues.date)
					? initialValues.date
					: typeof initialValues?.date === "string" &&
							isValid(parseISO(initialValues.date))
						? parseISO(initialValues.date)
						: new Date(),
			time: initialValues?.time || "00:00",
			location: initialValues?.location || "",
			description: initialValues?.description || "",
		}),
		[initialValues],
	);

	const form = useForm<MeetingInstanceFormValues>({
		resolver: zodResolver(MeetingInstanceFormSchema),
		defaultValues: computedDefaultValues,
	});

	const handleSubmit = async (values: MeetingInstanceFormValues) => {
		const result = await onSubmitAction(values);
		if (result.success) {
			if (onSuccess) onSuccess();
			if (!isEditing) form.reset(computedDefaultValues);
		}
	};

	const handleCancelClick = () => {
		if (onCancel) {
			onCancel();
		} else {
			form.reset(computedDefaultValues);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Nombre de la {isEditing ? "Instancia" : "Nueva Instancia"}
							</FormLabel>
							<FormControl>
								<Input {...field} disabled={isPending} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="date"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<FormLabel>Fecha</FormLabel>
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
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="time"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Hora</FormLabel>
								<FormControl>
									<Input type="time" {...field} disabled={isPending} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="location"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Ubicación</FormLabel>
								<FormControl>
									<Input {...field} disabled={isPending} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Descripción (Opcional)</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									value={field.value ?? ""}
									disabled={isPending}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end space-x-2 pt-4 border-t">
					{onCancel ? (
						<Button
							type="button"
							variant="outline"
							onClick={handleCancelClick}
							disabled={isPending}
						>
							{isEditing ? "Cancelar Edición" : "Cancelar"}
						</Button>
					) : (
						<DialogClose asChild>
							<Button
								type="button"
								variant="outline"
								onClick={handleCancelClick}
								disabled={isPending}
							>
								Cancelar
							</Button>
						</DialogClose>
					)}
					<Button type="submit" disabled={isPending}>
						{isPending && <Loader2 className="animate-spin mr-2" />}
						{isPending
							? isEditing
								? "Guardando..."
								: "Programando..."
							: isEditing
								? "Guardar Cambios"
								: "Programar Instancia"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
