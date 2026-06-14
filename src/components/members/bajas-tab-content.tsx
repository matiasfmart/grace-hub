"use client";

import { Archive, Info, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, GDI, Member, Meeting } from "@/lib/types";

interface BajasTabContentProps {
	eliminadosMembers: Member[];
	allAttendanceRecords: AttendanceRecord[];
	allMeetings: Meeting[];
	allGDIs: GDI[];
	restoreMemberAction: (
		memberId: string,
	) => Promise<{ success: boolean; message: string }>;
	deleteMemberAction: (
		memberId: string,
	) => Promise<{ success: boolean; message: string }>;
}

export default function BajasTabContent({
	eliminadosMembers,
	allAttendanceRecords,
	allMeetings,
	allGDIs,
	restoreMemberAction,
	deleteMemberAction,
}: BajasTabContentProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [searchTerm, setSearchTerm] = useState("");
	const [hardDeletePendingMemberId, setHardDeletePendingMemberId] = useState<string | null>(null);
	const [isProcessing, startTransition] = useTransition();

	// ─── Derived data ──────────────────────────────────────────────────────────
	const filteredMembers = useMemo(() => {
		if (!searchTerm.trim()) return eliminadosMembers;
		const term = searchTerm.toLowerCase().trim();
		return eliminadosMembers.filter(
			(m) =>
				`${m.firstName} ${m.lastName}`.toLowerCase().includes(term) ||
				m.firstName.toLowerCase().includes(term) ||
				m.lastName.toLowerCase().includes(term),
		);
	}, [eliminadosMembers, searchTerm]);

	const memberLastAttendance = useMemo(() => {
		const map = new Map<string, { date: Date; daysAgo: number }>();
		const now = new Date();
		for (const record of allAttendanceRecords) {
			if (!record.attended) continue;
			const meeting = allMeetings.find((m) => m.id === record.meetingId);
			if (!meeting) continue;
			const meetingDate = new Date(meeting.date);
			const daysAgo = Math.floor((now.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24));
			const existing = map.get(record.memberId);
			if (!existing || meetingDate > existing.date) {
				map.set(record.memberId, { date: meetingDate, daysAgo });
			}
		}
		return map;
	}, [allAttendanceRecords, allMeetings]);

	// ─── Helpers ───────────────────────────────────────────────────────────────
	const getAttendanceStatus = useCallback(
		(memberId: string) => {
			const attendance = memberLastAttendance.get(memberId);
			if (!attendance) {
				return {
					label: "Sin registro",
					color: "text-gray-400 dark:text-gray-500",
					bgColor: "bg-gray-100 dark:bg-gray-800/50",
				};
			}
			const { daysAgo, date } = attendance;
			const dateStr = date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
			if (daysAgo <= 7)
				return { label: dateStr, color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" };
			if (daysAgo <= 30)
				return { label: dateStr, color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" };
			return { label: dateStr, color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" };
		},
		[memberLastAttendance],
	);

	const getGdiName = useCallback(
		(member: Member): string => {
			if (!member.assignedGDIId) return "No asignado";
			const gdi = allGDIs.find((g) => g.id === member.assignedGDIId);
			return gdi ? gdi.name : "GDI no encontrado";
		},
		[allGDIs],
	);

	const canHardDelete = useCallback(
		(member: Member): boolean => {
			return !allAttendanceRecords.some((r) => r.memberId === member.id);
		},
		[allAttendanceRecords],
	);

	// ─── Handlers ──────────────────────────────────────────────────────────────
	const handleRestore = (member: Member) => {
		startTransition(async () => {
			const result = await restoreMemberAction(member.id);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	const confirmHardDelete = () => {
		if (!hardDeletePendingMemberId) return;
		const memberId = hardDeletePendingMemberId;
		setHardDeletePendingMemberId(null);
		startTransition(async () => {
			const result = await deleteMemberAction(memberId);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
			}
		});
	};

	// ─── KPIs ──────────────────────────────────────────────────────────────────
	const withAttendance = eliminadosMembers.filter((m) =>
		allAttendanceRecords.some((r) => r.memberId === m.id),
	).length;
	const withoutAttendance = eliminadosMembers.length - withAttendance;

	if (eliminadosMembers.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
				<Archive className="h-12 w-12 mb-4 opacity-30" />
				<p className="text-lg font-medium">No hay miembros dados de baja</p>
				<p className="text-sm mt-1">
					Cuando des de baja a un miembro, aparecerá aquí.
				</p>
			</div>
		);
	}

	const pendingHardDelete = eliminadosMembers.find((m) => m.id === hardDeletePendingMemberId);

	return (
		<>
			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="rounded-lg border bg-card p-4">
					<p className="text-sm text-muted-foreground">Total dados de baja</p>
					<p className="text-2xl font-bold mt-1">{eliminadosMembers.length}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<p className="text-sm text-muted-foreground">Con historial de asistencia</p>
					<p className="text-2xl font-bold mt-1">{withAttendance}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<p className="text-sm text-muted-foreground">Sin historial de asistencia</p>
					<p className="text-2xl font-bold mt-1">{withoutAttendance}</p>
				</div>
			</div>

			{/* Search */}
			{eliminadosMembers.length > 5 && (
				<div className="mb-4 relative max-w-xs">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Buscar dados de baja..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-9"
					/>
					{searchTerm && (
						<button
							onClick={() => setSearchTerm("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>
			)}

			{/* Table */}
			<div className="rounded-lg border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/20">
							<TableHead>Miembro</TableHead>						<TableHead>Teléfono</TableHead>							<TableHead>Último GDI</TableHead>
							<TableHead>Última asistencia</TableHead>
							<TableHead className="w-[120px]">
								<span className="sr-only">Acciones</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredMembers.map((member) => {
							const hardDeleteAllowed = canHardDelete(member);
							const attendanceStatus = getAttendanceStatus(member.id);
							return (
								<TableRow key={member.id} className="opacity-60 hover:opacity-90 transition-opacity">
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarFallback className="text-xs bg-gray-100 text-gray-400 dark:bg-gray-800">
													{member.firstName.substring(0, 1)}
													{member.lastName.substring(0, 1)}
												</AvatarFallback>
											</Avatar>
											<span className="font-medium line-through text-muted-foreground">
												{member.firstName} {member.lastName}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{member.phone || "—"}
										</span>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{getGdiName(member)}
										</span>
									</TableCell>
									<TableCell>
										<div
											className={cn(
												"inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
												attendanceStatus.bgColor,
												attendanceStatus.color,
											)}
										>
											{attendanceStatus.label}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center justify-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												disabled={isProcessing}
												onClick={() => handleRestore(member)}
												title="Restaurar miembro"
											>
												<RotateCcw className="h-4 w-4 text-muted-foreground" />
											</Button>
											{hardDeleteAllowed && (
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive hover:text-destructive"
													disabled={isProcessing}
													onClick={() => setHardDeletePendingMemberId(member.id)}
													title="Eliminar permanentemente"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				{filteredMembers.length === 0 && searchTerm && (
					<p className="text-center text-muted-foreground text-sm py-6">
						No se encontró &quot;{searchTerm}&quot; en dados de baja.
					</p>
				)}
			</div>

			{/* AlertDialog: Eliminar permanentemente */}
			<AlertDialog
				open={hardDeletePendingMemberId !== null}
				onOpenChange={(open) => {
					if (!open) setHardDeletePendingMemberId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción <strong>no se puede deshacer</strong>. Se eliminará
							completamente el registro de{" "}
							<strong>
								{pendingHardDelete?.firstName} {pendingHardDelete?.lastName}
							</strong>
							. Solo es posible porque este miembro no tiene historial de asistencia
							ni diezmos.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmHardDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Eliminar permanentemente
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
