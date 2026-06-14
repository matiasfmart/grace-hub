"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { UserPlus, Phone, CalendarDays, StickyNote, User, BookOpen } from "lucide-react";
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
import { createProspectAction, getMeetingSeriesForProspectAction } from "@/app/(protected)/actions/prospectActions";
import { nowLocalISO } from "@/lib/utils/date";
import type { Member, MeetingSeries, Prospect } from "@/lib/types";

interface RegisterProspectDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onProspectCreated: (prospect: Prospect) => void;
	allMembers: Member[];
}

function todayISO(): string {
	return nowLocalISO();
}

export default function RegisterProspectDialog({
	isOpen,
	onClose,
	onProspectCreated,
	allMembers,
}: RegisterProspectDialogProps) {
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();
	const firstNameRef = useRef<HTMLInputElement>(null);

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [visitDate, setVisitDate] = useState(nowLocalISO);
	const [contact, setContact] = useState("");
	const [notes, setNotes] = useState("");
	const [addedBy, setAddedBy] = useState<string>("");
	const [addedByName, setAddedByName] = useState<string>("");
	const [memberSearch, setMemberSearch] = useState<string>("");
	const [showMemberDropdown, setShowMemberDropdown] = useState(false);
	const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; visitDate?: string; addedBy?: string }>({});

	// Meeting series state — persists across submissions
	const [meetingSeriesId, setMeetingSeriesId] = useState<string>("");
	const [allSeries, setAllSeries] = useState<MeetingSeries[]>([]);
	const [seriesLoaded, setSeriesLoaded] = useState(false);

	// Restore series from localStorage on mount
	useEffect(() => {
		try {
			const savedId = localStorage.getItem("ghw_meeting_series_id");
			if (savedId) setMeetingSeriesId(savedId);
		} catch { /* ignore SSR / private mode */ }
	}, []);

	// Load series on first open
	useEffect(() => {
		if (!isOpen || seriesLoaded) return;
		getMeetingSeriesForProspectAction().then((res) => {
			if (res.success) setAllSeries(res.series ?? []);
			setSeriesLoaded(true);
		}).catch(() => setSeriesLoaded(true));
	}, [isOpen, seriesLoaded]);

	// Persist series selection to localStorage
	const handleSeriesChange = (value: string) => {
		setMeetingSeriesId(value);
		try {
			if (value) localStorage.setItem("ghw_meeting_series_id", value);
			else localStorage.removeItem("ghw_meeting_series_id");
		} catch { /* ignore */ }
	};
	// Reset form when dialog opens (series intentionally NOT reset)
	useEffect(() => {
		if (isOpen) {
			setFirstName("");
			setLastName("");
			setVisitDate(nowLocalISO());
			setContact("");
			setNotes("");
			setAddedBy("");
			setAddedByName("");
			setMemberSearch("");
			setShowMemberDropdown(false);
			setErrors({});
			// Focus first field after animation
			setTimeout(() => firstNameRef.current?.focus(), 80);
		}
	}, [isOpen]);

	const validate = (): boolean => {
		const newErrors: typeof errors = {};
		if (!firstName.trim()) newErrors.firstName = "El nombre es requerido.";
		if (!lastName.trim()) newErrors.lastName = "El apellido es requerido.";
		if (!visitDate) newErrors.visitDate = "La fecha de visita es requerida.";
		if (!addedBy) newErrors.addedBy = "Seleccioná quién lo agregó.";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		startTransition(async () => {
			const result = await createProspectAction({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				visitDate,
				contact: contact.trim() || undefined,
				notes: notes.trim() || undefined,
				addedBy: addedBy ? Number(addedBy) : undefined,
				meetingSeriesId: meetingSeriesId || undefined,
			// addedByName is display-only, not sent to server
			});

			if (result.success && result.prospect) {
				toast({ title: "Visitante registrado", description: `${result.prospect.firstName} ${result.prospect.lastName} fue agregado a la lista de pendientes.` });
				// Enrich with local addedByName — the server's save() doesn't JOIN members
				const enriched = addedByName ? { ...result.prospect, addedByName } : result.prospect;
				onProspectCreated(enriched);
				onClose();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
							<UserPlus className="h-4 w-4 text-primary" />
						</div>
						Registrar visitante
					</DialogTitle>
					<DialogDescription>
						Completá los datos básicos del visitante. Luego podés integrarlo como miembro o archivarlo.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-5 pt-1">
					{/* Nombre y Apellido en grid */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="rp-firstName" className="text-sm font-medium">
								Nombre <span className="text-destructive">*</span>
							</Label>
							<Input
								id="rp-firstName"
								ref={firstNameRef}
								value={firstName}
								onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined })); }}
								placeholder="Ej: María"
								maxLength={100}
								disabled={isPending}
								className={errors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}
							/>
							{errors.firstName && (
								<p className="text-xs text-destructive">{errors.firstName}</p>
							)}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="rp-lastName" className="text-sm font-medium">
								Apellido <span className="text-destructive">*</span>
							</Label>
							<Input
								id="rp-lastName"
								value={lastName}
								onChange={(e) => { setLastName(e.target.value); if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined })); }}
								placeholder="Ej: García"
								maxLength={100}
								disabled={isPending}
								className={errors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}
							/>
							{errors.lastName && (
								<p className="text-xs text-destructive">{errors.lastName}</p>
							)}
						</div>
					</div>

					{/* Fecha de visita */}
					<div className="space-y-1.5">
						<Label htmlFor="rp-visitDate" className="text-sm font-medium flex items-center gap-1.5">
							<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
						Fecha y hora de visita <span className="text-destructive">*</span>
					</Label>
					<Input
						id="rp-visitDate"
						type="datetime-local"
						value={visitDate}
						onChange={(e) => { setVisitDate(e.target.value); if (errors.visitDate) setErrors(prev => ({ ...prev, visitDate: undefined })); }}
						max={nowLocalISO()}
						disabled={isPending}
						className={errors.visitDate ? "border-destructive focus-visible:ring-destructive" : ""}
					/>
					{errors.visitDate && (
						<p className="text-xs text-destructive">{errors.visitDate}</p>
					)}
				</div>

				{/* Serie de reunión */}
				<div className="space-y-1.5">
					<Label className="text-sm font-medium flex items-center gap-1.5">
						<BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
						Reunión
						<span className="text-xs text-muted-foreground font-normal">(opcional)</span>
					</Label>
					<Select value={meetingSeriesId} onValueChange={handleSeriesChange} disabled={isPending}>
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
						<Label htmlFor="rp-contact" className="text-sm font-medium flex items-center gap-1.5">
							<Phone className="h-3.5 w-3.5 text-muted-foreground" />
							Teléfono / Contacto
							<span className="text-xs text-muted-foreground font-normal">(opcional)</span>
						</Label>
						<Input
							id="rp-contact"
							value={contact}
							onChange={(e) => setContact(e.target.value)}
							placeholder="Ej: +54 9 11 1234-5678"
							maxLength={100}
							disabled={isPending}
						/>
					</div>

					{/* Notas */}
					<div className="space-y-1.5">
						<Label htmlFor="rp-notes" className="text-sm font-medium flex items-center gap-1.5">
							<StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
							Notas
							<span className="text-xs text-muted-foreground font-normal">(opcional)</span>
						</Label>
						<Textarea
							id="rp-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Ej: Vino con Juan. Interesada en el GDI de jóvenes."
							rows={2}
							maxLength={500}
							disabled={isPending}
							className="resize-none"
						/>
					</div>

{/* Agregado por — searchable combobox */}
				<div className="space-y-1.5">
					<Label className="text-sm font-medium flex items-center gap-1.5">
						<User className="h-3.5 w-3.5 text-muted-foreground" />
						Agregado por <span className="text-destructive">*</span>
					</Label>
					<div className="relative">
						{/* Selected value display / search input */}
						{addedBy && !showMemberDropdown ? (
							<button
								type="button"
								disabled={isPending}
								onClick={() => { setShowMemberDropdown(true); setMemberSearch(""); }}
								className={`flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm bg-transparent shadow-sm hover:bg-accent ${errors.addedBy ? "border-destructive" : "border-input"}`}
							>
								<span>{addedByName}</span>
								<span className="text-xs text-muted-foreground">Cambiar</span>
							</button>
						) : (
							<Input
								value={memberSearch}
								onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
								onFocus={() => setShowMemberDropdown(true)}
								onBlur={() => setTimeout(() => setShowMemberDropdown(false), 150)}
								placeholder="Buscar miembro..."
								disabled={isPending}
								autoComplete="off"
								className={errors.addedBy ? "border-destructive focus-visible:ring-destructive" : ""}
							/>
						)}
						{/* Dropdown list */}
						{showMemberDropdown && (() => {
							const filtered = allMembers
								.filter((m) => m.status === "vigente")
								.filter((m) =>
									`${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
								)
								.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
							return filtered.length > 0 ? (
								<ul className="absolute z-50 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
									{filtered.map((m) => (
										<li key={m.id}>
											<button
												type="button"
												onMouseDown={() => {
													setAddedBy(m.id);
													setAddedByName(`${m.firstName} ${m.lastName}`);
													setMemberSearch("");
													setShowMemberDropdown(false);
													if (errors.addedBy) setErrors(prev => ({ ...prev, addedBy: undefined }));
												}}
												className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
											>
												{m.firstName} {m.lastName}
											</button>
										</li>
									))}
								</ul>
							) : memberSearch ? (
								<div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2.5 text-sm text-muted-foreground shadow-md">
									No se encontraron miembros.
								</div>
							) : null;
						})()}
					</div>
						{errors.addedBy && (
							<p className="text-xs text-destructive">{errors.addedBy}</p>
						)}
					</div>

					{/* Acciones */}
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="ghost"
							onClick={onClose}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<>
									<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									Registrando...
								</>
							) : (
								<>
									<UserPlus className="mr-2 h-4 w-4" />
									Registrar visitante
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
