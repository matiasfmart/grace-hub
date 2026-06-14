"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, Pencil, Phone, CalendarDays, StickyNote, User, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateProspectAction, getMeetingSeriesForProspectAction } from "@/app/(protected)/actions/prospectActions";
import { nowLocalISO, formatProspectVisitDate } from "@/lib/utils/date";
import type { MeetingSeries, Prospect } from "@/lib/types";

interface EditProspectDialogProps {
	prospect: Prospect | null;
	isOpen: boolean;
	onClose: () => void;
	/** Called after a successful edit. Not required in readOnly mode. */
	onUpdated?: (updated: Prospect) => void;
	/** When true the dialog is a read-only detail view (no save). */
	readOnly?: boolean;
}

export default function EditProspectDialog({
	prospect,
	isOpen,
	onClose,
	onUpdated,
	readOnly = false,
}: EditProspectDialogProps) {
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();
	const firstNameRef = useRef<HTMLInputElement>(null);

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [visitDate, setVisitDate] = useState("");
	const [contact, setContact] = useState("");
	const [notes, setNotes] = useState("");
	const [errors, setErrors] = useState<{
		firstName?: string;
		lastName?: string;
		visitDate?: string;
	}>({});

	// Meeting series state
	const [meetingSeriesId, setMeetingSeriesId] = useState<string>("");
	const [allSeries, setAllSeries] = useState<MeetingSeries[]>([]);
	const [seriesLoaded, setSeriesLoaded] = useState(false);

	// Load series on first open (only once)
	useEffect(() => {
		if (!isOpen || readOnly || seriesLoaded) return;
		getMeetingSeriesForProspectAction().then((res) => {
			if (res.success) setAllSeries(res.series ?? []);
			setSeriesLoaded(true);
		}).catch(() => setSeriesLoaded(true));
	}, [isOpen, readOnly, seriesLoaded]);

	useEffect(() => {
		if (isOpen && prospect) {
			setFirstName(prospect.firstName);
			setLastName(prospect.lastName);
			// Convert legacy YYYY-MM-DD to datetime-local format for the input
			const rawDate = prospect.visitDate ?? "";
			const isPlain = /^\d{4}-\d{2}-\d{2}$/.test(rawDate);
			setVisitDate(isPlain ? `${rawDate}T00:00` : rawDate.slice(0, 16));
			setContact(prospect.contact ?? "");
			setNotes(prospect.notes ?? "");
			setMeetingSeriesId(prospect.meetingSeriesId ?? "");
			setErrors({});
			if (!readOnly) setTimeout(() => firstNameRef.current?.focus(), 80);
		}
	}, [isOpen, prospect, readOnly]);

	const validate = (): boolean => {
		const newErrors: typeof errors = {};
		if (!firstName.trim()) newErrors.firstName = "El nombre es requerido.";
		if (!lastName.trim()) newErrors.lastName = "El apellido es requerido.";
		if (!visitDate) newErrors.visitDate = "La fecha de visita es requerida.";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!prospect || !validate()) return;

		startTransition(async () => {
			const result = await updateProspectAction(prospect.id, {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				visitDate,
				contact: contact.trim() || undefined,
				notes: notes.trim() || undefined,
				meetingSeriesId: meetingSeriesId || undefined,
			});

			if (result.success && result.prospect) {
				toast({
					title: "Visitante actualizado",
					description: `${result.prospect.firstName} ${result.prospect.lastName} fue actualizado.`,
				});
				// Preserve addedByName — updateFields doesn't change it and the
				// backend save() path doesn't JOIN; we carry it from the original.
				const enriched = prospect.addedByName
					? { ...result.prospect, addedByName: prospect.addedByName }
					: result.prospect;
				onUpdated?.(enriched);
				onClose();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const title = readOnly ? "Detalle del visitante" : "Editar visitante";
	const description = readOnly
		? prospect
			? `Información completa de ${prospect.firstName} ${prospect.lastName}.`
			: ""
		: prospect
			? `Editando datos de ${prospect.firstName} ${prospect.lastName}.`
			: "";

	return (
		<Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
							{readOnly ? (
								<Eye className="h-4 w-4 text-primary" />
							) : (
								<Pencil className="h-4 w-4 text-primary" />
							)}
						</div>
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 pt-1">
					{/* Agregado por + Fuente — read-only metadata always visible */}
					{prospect && (prospect.addedByName || prospect.source) && (
						<div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
							<span className="flex items-center gap-1.5 text-muted-foreground">
								<User className="h-3.5 w-3.5 shrink-0" />
								<span className="font-medium text-foreground">
									{prospect.addedByName ?? "—"}
								</span>
							</span>
							{prospect.source && (
								<Badge variant="outline" className="text-xs">
									{prospect.source === "pwa" ? "PWA" : "Manual"}
								</Badge>
							)}
						</div>
					)}

					{/* Nombre y Apellido */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="ep-firstName" className="text-sm font-medium">
								Nombre {!readOnly && <span className="text-destructive">*</span>}
							</Label>
							{readOnly ? (
								<p className="text-sm px-1 py-1.5">{firstName || "—"}</p>
							) : (
								<>
									<Input
										id="ep-firstName"
										ref={firstNameRef}
										value={firstName}
										onChange={(e) => {
											setFirstName(e.target.value);
											if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined }));
										}}
										maxLength={100}
										disabled={isPending}
										className={errors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}
									/>
									{errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
								</>
							)}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="ep-lastName" className="text-sm font-medium">
								Apellido {!readOnly && <span className="text-destructive">*</span>}
							</Label>
							{readOnly ? (
								<p className="text-sm px-1 py-1.5">{lastName || "—"}</p>
							) : (
								<>
									<Input
										id="ep-lastName"
										value={lastName}
										onChange={(e) => {
											setLastName(e.target.value);
											if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined }));
										}}
										maxLength={100}
										disabled={isPending}
										className={errors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}
									/>
									{errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
								</>
							)}
						</div>
					</div>

					{/* Fecha de visita */}
					<div className="space-y-1.5">
						<Label htmlFor="ep-visitDate" className="text-sm font-medium flex items-center gap-1.5">
							<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
							Fecha y hora de visita {!readOnly && <span className="text-destructive">*</span>}
						</Label>
						{readOnly ? (
							<div className="flex flex-col gap-0.5 px-1 py-1.5">
								<p className="text-sm">{visitDate ? formatProspectVisitDate(prospect?.visitDate ?? "") : "—"}</p>
								{prospect?.meetingSeriesName && (
									<p className="text-xs text-muted-foreground">{prospect.meetingSeriesName}</p>
								)}
							</div>
						) : (
							<>
								<Input
									id="ep-visitDate"
									type="datetime-local"
									value={visitDate}
									onChange={(e) => {
										setVisitDate(e.target.value);
										if (errors.visitDate) setErrors((p) => ({ ...p, visitDate: undefined }));
									}}
									max={nowLocalISO()}
									disabled={isPending}
									className={errors.visitDate ? "border-destructive focus-visible:ring-destructive" : ""}
								/>
								{errors.visitDate && <p className="text-xs text-destructive">{errors.visitDate}</p>}
							</>
						)}
					</div>

					{/* Serie de reunión */}
					{!readOnly && (
						<div className="space-y-1.5">
							<Label className="text-sm font-medium flex items-center gap-1.5">
								<BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
								Reunión
								<span className="text-xs text-muted-foreground font-normal">(opcional)</span>
							</Label>
							<Select value={meetingSeriesId} onValueChange={setMeetingSeriesId} disabled={isPending}>
								<SelectTrigger>
									<SelectValue placeholder="Sin especificar" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Sin especificar</SelectItem>
									{allSeries.map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Contacto */}
					<div className="space-y-1.5">
						<Label htmlFor="ep-contact" className="text-sm font-medium flex items-center gap-1.5">
							<Phone className="h-3.5 w-3.5 text-muted-foreground" />
							Teléfono / Contacto
							{!readOnly && (
								<span className="text-xs text-muted-foreground font-normal">(opcional)</span>
							)}
						</Label>
						{readOnly ? (
							<p className="text-sm px-1 py-1.5 text-muted-foreground">{contact || "—"}</p>
						) : (
							<Input
								id="ep-contact"
								value={contact}
								onChange={(e) => setContact(e.target.value)}
								placeholder="Ej: +54 9 11 1234-5678"
								maxLength={100}
								disabled={isPending}
							/>
						)}
					</div>

					{/* Notas */}
					<div className="space-y-1.5">
						<Label htmlFor="ep-notes" className="text-sm font-medium flex items-center gap-1.5">
							<StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
							Notas
							{!readOnly && (
								<span className="text-xs text-muted-foreground font-normal">(opcional)</span>
							)}
						</Label>
						{readOnly ? (
							<p className="text-sm px-1 py-1.5 text-muted-foreground whitespace-pre-wrap">
								{notes || "—"}
							</p>
						) : (
							<Textarea
								id="ep-notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={2}
								maxLength={500}
								disabled={isPending}
								className="resize-none"
							/>
						)}
					</div>

					{/* Acciones */}
					<div className="flex justify-end gap-2 pt-1">
						{readOnly ? (
							<Button type="button" variant="outline" onClick={onClose}>
								Cerrar
							</Button>
						) : (
							<>
								<Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
									Cancelar
								</Button>
								<Button type="submit" disabled={isPending}>
									{isPending ? (
										<>
											<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
											Guardando...
										</>
									) : (
										<>
											<Pencil className="mr-2 h-4 w-4" />
											Guardar cambios
										</>
									)}
								</Button>
							</>
						)}
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
