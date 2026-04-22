"use client";

import { differenceInYears, endOfMonth, endOfYear, parseISO, startOfMonth, startOfYear } from "date-fns";
import {
	BookOpenCheck,
	Building2,
	CalendarDays,
	Check,
	Church,
	ChevronLeft,
	ChevronRight,
	GraduationCap,
	HandCoins,
	Loader2,
	Mail,
	MapPin,
	Pencil,
	Phone,
	Printer,
	Tag,
	Trash2,
	TrendingUp,
	User,
	Users,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type {
	AddMemberFormValues,
	AttendanceRecord,
	EcclesiasticalRole,
	GDI,
	Meeting,
	MeetingSeries,
	Member,
	MemberRoleType,
	MinistryArea,
	TitheRecord,
} from "@/lib/types";
import type { RoleType } from "@/lib/api/mappers";
import { toApiDateString } from "@/lib/utils/date";
import {
	computeMemberAttendanceData,
	isMemberExpectedAtMeeting,
} from "@/lib/utils/attendance";
import {
	softDeleteMemberAction,
	assignEcclesiasticalRoleAction,
	removeEcclesiasticalRoleAction,
} from "@/app/(protected)/actions/memberActions";
import AddMemberForm from "./add-member-form";
import MemberAttendanceSummary from "./member-attendance-chart";
import MemberAttendanceLineChart from "./member-attendance-line-chart";
import MemberTitheHistory from "./member-tithe-history"; // New import

interface MemberDetailsDialogProps {
	member: Member | null;
	allMembers: Member[];
	allGDIs: GDI[];
	allMinistryAreas: MinistryArea[];
	allMeetings: Meeting[];
	allMeetingSeries: MeetingSeries[];
	allAttendanceRecords: AttendanceRecord[];
	allTitheRecords: TitheRecord[];
	allRoleTypes: RoleType[];
	isOpen: boolean;
	onClose: () => void;
	onMemberUpdated: (updatedMember: Member) => void;
	updateMemberAction: (
		memberData: Member,
	) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
}

const roleDisplayNames: Record<MemberRoleType, string> = {
	GdiGuide: "Guía GDI",
	GdiMentor: "Mentor GDI",
	AreaLeader: "Líder Área",
	AreaMentor: "Mentor Área",
	Worker: "Obrero",
};

// Role badge colors - unified palette based on primary color
const roleBadgeColors: Record<MemberRoleType, string> = {
	GdiGuide: "bg-primary/15 text-primary border-primary/30",
	GdiMentor: "bg-primary/10 text-primary/80 border-primary/20",
	AreaLeader: "bg-primary/15 text-primary border-primary/30",
	AreaMentor: "bg-primary/10 text-primary/80 border-primary/20",
	Worker: "bg-primary/5 text-primary/70 border-primary/15",
};

const MONTH_OPTIONS = [
	{ value: 1, label: "Enero" },
	{ value: 2, label: "Febrero" },
	{ value: 3, label: "Marzo" },
	{ value: 4, label: "Abril" },
	{ value: 5, label: "Mayo" },
	{ value: 6, label: "Junio" },
	{ value: 7, label: "Julio" },
	{ value: 8, label: "Agosto" },
	{ value: 9, label: "Septiembre" },
	{ value: 10, label: "Octubre" },
	{ value: 11, label: "Noviembre" },
	{ value: 12, label: "Diciembre" },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i).reverse();

export default function MemberDetailsDialog({
	member,
	allMembers,
	allGDIs,
	allMinistryAreas,
	allMeetings,
	allMeetingSeries,
	allAttendanceRecords,
	allTitheRecords,
	allRoleTypes,
	isOpen,
	onClose,
	onMemberUpdated,
	updateMemberAction,
}: MemberDetailsDialogProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();
	const [activeTab, setActiveTab] = useState("profile");

	// Local state for ecclesiastical roles (optimistic updates)
	const [localEcclesiasticalRoles, setLocalEcclesiasticalRoles] = useState<EcclesiasticalRole[]>(
		member?.ecclesiasticalRoles || [],
	);
	const [isRolePopoverOpen, setIsRolePopoverOpen] = useState(false);

	// Sync localEcclesiasticalRoles when member prop changes
	useEffect(() => {
		setLocalEcclesiasticalRoles(member?.ecclesiasticalRoles || []);
	}, [member?.id, member?.ecclesiasticalRoles]);

	const [attendanceSelectedSeriesId, setAttendanceSelectedSeriesId] =
		useState<string>("all");
	const [selectedYear, setSelectedYear] = useState<number>(
		new Date().getFullYear(),
	);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	// Tithe range filter — independent from attendance year selector
	const [titheStartMonth, setTitheStartMonth] = useState<number>(1);
	const [titheStartYear, setTitheStartYear] = useState<number>(new Date().getFullYear());
	const [titheEndMonth, setTitheEndMonth] = useState<number>(new Date().getMonth() + 1);
	const [titheEndYear, setTitheEndYear] = useState<number>(new Date().getFullYear());

	const dialogContentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen) {
			setAttendanceSelectedSeriesId("all");
			setSelectedYear(new Date().getFullYear());
			setTitheStartMonth(1);
			setTitheStartYear(new Date().getFullYear());
			setTitheEndMonth(new Date().getMonth() + 1);
			setTitheEndYear(new Date().getFullYear());
		}
	}, [isOpen]);

	const formatDate = (date?: Date | string) => {
		if (!date) return "N/A";
		// Handle both Date objects and strings (strings may come from serialization)
		// Check if it's already a valid Date with getTime method
		let dateObj: Date;
		if (date instanceof Date && typeof date.getTime === 'function') {
			dateObj = date;
		} else {
			// Convert string or invalid Date-like object to Date
			dateObj = new Date(String(date));
		}
		if (isNaN(dateObj.getTime())) return "N/A";
		return dateObj.toLocaleDateString("es-ES", {
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "UTC",
		});
	};

	const memberGDIInfo = useMemo(() => {
		if (!member || !member.assignedGDIId)
			return { gdiName: "No asignado", guideName: "N/A" };
		const gdi = allGDIs.find((g) => g.id === member.assignedGDIId); // Changed g.id to g._id
		if (!gdi) return { gdiName: "GDI no encontrado", guideName: "N/A" };
		const guide = allMembers.find((m) => m.id === gdi.guideId); // Changed m.id to m._id
		return {
			gdiName: gdi.name,
			guideName: guide
				? `${guide.firstName} ${guide.lastName}`
				: "Guía no encontrado",
		};
	}, [member, allGDIs, allMembers]);

	const memberAreaNames = useMemo(() => {
		if (
			!member ||
			!member.assignedAreaIds ||
			member.assignedAreaIds.length === 0
		)
			return ["Ninguna"];
		return member.assignedAreaIds
			.map(
				(areaId) => allMinistryAreas.find((area) => area.id === areaId)?.name,
			) // Changed area.id to area._id
			.filter(Boolean) as string[];
	}, [member, allMinistryAreas]);

	const baptismDate = member?.baptismDate ? formatDate(member.baptismDate) : "N/A";

	// Attendance data computed once for the selected year + series — shared across chart & table
	const attendanceData = useMemo(() => {
		if (!member) return null;
		return computeMemberAttendanceData(
			member,
			selectedYear,
			attendanceSelectedSeriesId,
			allMeetings,
			allMeetingSeries,
			allAttendanceRecords,
		);
	}, [member, selectedYear, attendanceSelectedSeriesId, allMeetings, allMeetingSeries, allAttendanceRecords]);

	// Calculate KPIs for the member (global, not filtered by year)
	const memberKPIs = useMemo(() => {
		if (!member) return { attendanceRate: 0, titheMonths: 0, churchYears: 0, totalMeetingsExpected: 0 };

		// Build record set once for O(1) lookup
		const recordSet = new Set<string>(
			allAttendanceRecords.map((r) => `${r.meetingId}:${r.memberId}`),
		);
		const seriesMap = new Map(allMeetingSeries.map((s) => [s.id, s]));

		const expectedMeetings = allMeetings.filter((m) =>
			isMemberExpectedAtMeeting(member, m, seriesMap.get(m.seriesId), recordSet),
		);
		const attendedCount = allAttendanceRecords.filter(
			(r) => r.memberId === member.id && r.attended,
		).length;
		const recordedCount = allAttendanceRecords.filter(
			(r) => r.memberId === member.id,
		).length;
		const attendanceRate = recordedCount > 0
			? Math.round((attendedCount / recordedCount) * 100)
			: 0;

		const currentYear = new Date().getFullYear();
		const titheMonths = allTitheRecords.filter(
			(r) => r.memberId === member.id && r.year === currentYear,
		).length;

		let churchYears = 0;
		if (member.churchJoinDate) {
			churchYears = differenceInYears(new Date(), parseISO(member.churchJoinDate));
		}

		return {
			attendanceRate,
			titheMonths,
			churchYears,
			totalMeetingsExpected: expectedMeetings.length,
		};
	}, [member, allMeetings, allMeetingSeries, allAttendanceRecords, allTitheRecords]);

	const displayStatus = (status: Member["status"]) => {
		switch (status) {
			case "vigente":
				return "Vigente";
			case "eliminado":
				return "Eliminado";
			default:
				return status;
		}
	};

	const relevantSeriesForAttendanceDropdown = useMemo(() => {
		if (!member) return [];

		const recordSet = new Set<string>(
			allAttendanceRecords.map((r) => `${r.meetingId}:${r.memberId}`),
		);
		const seriesMap = new Map(allMeetingSeries.map((s) => [s.id, s]));

		const relevantSeriesIds = new Set<string>();
		allMeetings.forEach((meeting) => {
			if (isMemberExpectedAtMeeting(member, meeting, seriesMap.get(meeting.seriesId), recordSet)) {
				relevantSeriesIds.add(meeting.seriesId);
			}
		});

		return allMeetingSeries
			.filter((s) => relevantSeriesIds.has(s.id))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [member, allMeetings, allMeetingSeries, allAttendanceRecords]);

	const _expectedAttendeesMap = useMemo(() => {
		const map: Record<string, Set<string>> = {};
		allMeetings.forEach((meeting) => {
			map[meeting.id] = new Set(meeting.attendeeUids || []); // Changed meeting.id to meeting._id
		});
		return map;
	}, [allMeetings]);

	const handleToggleEcclesiasticalRole = async (roleType: RoleType) => {
		if (!member) return;

		const roleTypeId = Number(roleType.id);
		const isCurrentlyAssigned = localEcclesiasticalRoles.some(
			(r) => r.roleTypeId === roleTypeId,
		);

		// Optimistic update
		if (isCurrentlyAssigned) {
			setLocalEcclesiasticalRoles((prev) =>
				prev.filter((r) => r.roleTypeId !== roleTypeId),
			);
		} else {
			setLocalEcclesiasticalRoles((prev) => [
				...prev,
				{ roleTypeId, name: roleType.name },
			]);
		}

		try {
			const action = isCurrentlyAssigned
				? removeEcclesiasticalRoleAction
				: assignEcclesiasticalRoleAction;
			const result = await action(member.id, roleTypeId);
			if (!result.success) throw new Error(result.message);
			// Propagate change to parent so the member list reflects it
			onMemberUpdated({
				...member,
				ecclesiasticalRoles: isCurrentlyAssigned
					? (member.ecclesiasticalRoles || []).filter(
							(r) => r.roleTypeId !== roleTypeId,
						)
					: [
							...(member.ecclesiasticalRoles || []),
							{ roleTypeId, name: roleType.name },
						],
			});
		} catch {
			// Revert on error
			setLocalEcclesiasticalRoles(member.ecclesiasticalRoles || []);
			toast({
				title: "Error",
				description: `No se pudo ${isCurrentlyAssigned ? "quitar" : "asignar"} la etiqueta "${roleType.name}".`,
				variant: "destructive",
			});
		}
	};

	const handleEditToggle = () => {
		setIsEditing(!isEditing);
		if (!isEditing) {
			setActiveTab("profile");
		}
	};

	const handleFormSubmit = async (
		data: AddMemberFormValues,
		_memberId?: string,
	) => {
		// Usar el objeto `member` del estado del diálogo para asegurar que tenemos la referencia correcta.
		if (!member || !member.id) {
			toast({
				title: "Error de Referencia",
				description:
					"No se pudo identificar al miembro para actualizar. Por favor, cierre y vuelva a abrir el diálogo.",
				variant: "destructive",
			});
			return;
		}

		const updatedMemberData: Member = {
			...member, // Preserva campos no editables como id, _id, roles, etc.
			...data,
			// Convert Date from form to string for Member type (YYYY-MM-DD format)
			birthDate: toApiDateString(data.birthDate),
			churchJoinDate: toApiDateString(data.churchJoinDate),
			baptismDate: toApiDateString(data.baptismDate),
		};

		startTransition(async () => {
			const result = await updateMemberAction(updatedMemberData);
			if (result.success && result.updatedMember) {
				toast({
					title: "Éxito",
					description: result.message,
				});
				onMemberUpdated(result.updatedMember);
				setIsEditing(false);
				setActiveTab("profile");
				onClose();
			} else {
				toast({
					title: "Error al Actualizar",
					description: result.message || "Ocurrió un error desconocido.",
					variant: "destructive",
				});
			}
		});
	};

	// CU-M-004: Dar de baja — soft delete reversible (record_status → 'eliminado').
	// El miembro pasa a la sección "Dados de baja"; su historial se conserva intacto.
	// El hard delete (CU-M-004c) solo está disponible desde esa sección.
	const handleDeleteConfirm = () => {
		if (!member) return;

		startTransition(async () => {
			const result = await softDeleteMemberAction(member.id);
			if (result.success) {
				toast({
					title: "Miembro dado de baja",
					description: result.message,
				});
				setIsDeleteDialogOpen(false);
				// Notifica al padre para actualización optimista + router.refresh()
				onMemberUpdated({ ...member, status: "eliminado" });
				onClose();
			} else {
				toast({
					title: "Error al dar de baja",
					description: result.message,
					variant: "destructive",
				});
				setIsDeleteDialogOpen(false);
			}
		});
	};

	const handleCloseDialog = () => {
		setIsEditing(false);
		setActiveTab("profile");
		onClose();
	};

	const handlePrintAttendance = () => {
		const dialogContentElem = dialogContentRef.current;
		if (!dialogContentElem) return;

		const originalBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden"; // Prevent body scroll during print

		dialogContentElem.classList.add("is-printing-member-attendance");

		const afterPrintHandler = () => {
			dialogContentElem.classList.remove("is-printing-member-attendance");
			document.body.style.overflow = originalBodyOverflow;
			window.removeEventListener("afterprint", afterPrintHandler);
		};

		window.addEventListener("afterprint", afterPrintHandler);
		window.print();

		// Fallback for browsers that might not fire 'afterprint' reliably when print is cancelled
		setTimeout(() => {
			if (
				dialogContentElem.classList.contains("is-printing-member-attendance")
			) {
				afterPrintHandler();
			}
		}, 1000);
	};

	if (!member) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleCloseDialog}>
			<DialogContent
				ref={dialogContentRef}
				className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0"
			>
				{/* HEADER COMPACTO - 64px */}
				<DialogHeader className="px-4 py-3 border-b no-print">
					<div className="flex items-center justify-between pr-8">
						<div className="flex items-center gap-3">
							<Avatar className="h-12 w-12 border-2 border-primary/20">
								<AvatarFallback className="bg-primary/10 text-primary font-semibold">
									{member.firstName.substring(0, 1)}
									{member.lastName.substring(0, 1)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<DialogTitle className="text-lg font-semibold truncate">
									{member.firstName} {member.lastName}
								</DialogTitle>
								<div className="flex flex-wrap gap-1.5 items-center mt-0.5">
									<Badge
										variant="outline"
										className={
											member.status === "vigente"
												? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs h-5 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40"
												: "bg-red-50 text-red-700 border-red-200 text-xs h-5 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40"
										}
									>
										{displayStatus(member.status)}
									</Badge>
									{member.roles && member.roles.slice(0, 2).map((role) => (
										<Badge
											key={role}
											variant="outline"
											className={`text-xs h-5 ${roleBadgeColors[role] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
										>
											{roleDisplayNames[role] || role}
										</Badge>
									))}
									{member.roles && member.roles.length > 2 && (
										<Badge variant="outline" className="text-xs h-5">
											+{member.roles.length - 2}
										</Badge>
									)}
								</div>
							</div>
						</div>
						{!isEditing && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											onClick={handleEditToggle}
											variant="outline"
											size="icon"
											className="h-8 w-8"
										>
											<Pencil className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Editar miembro</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
					{isEditing && (
						<DialogDescription className="text-sm mt-2">
							Modifique los campos necesarios y guarde los cambios.
						</DialogDescription>
					)}
				</DialogHeader>

				{isEditing ? (
					<div className="flex-grow overflow-y-auto min-h-0">
						<AddMemberForm
							initialMemberData={member}
							onSubmitMember={(data) => handleFormSubmit(data, member.id)}
							allGDIs={allGDIs}
							allMinistryAreas={allMinistryAreas}
							allMembers={allMembers}
							submitButtonText="Guardar Cambios"
							cancelButtonText="Cancelar Edición"
							onDialogClose={handleEditToggle}
							isSubmitting={isPending}
						/>
					</div>
				) : (
					<>
						{/* STATS BAR FIJA - Siempre visible */}
						<div className="px-4 py-3 bg-muted/30 border-b no-print">
							<div className="grid grid-cols-4 gap-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex flex-col items-center p-2 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-default">
												<TrendingUp className="h-4 w-4 text-primary mb-0.5" />
												<span className="text-lg font-bold text-primary">{memberKPIs.attendanceRate}%</span>
												<span className="text-[10px] text-muted-foreground leading-tight">Asistencia</span>
											</div>
										</TooltipTrigger>
										<TooltipContent>Porcentaje global de asistencia a reuniones convocadas</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex flex-col items-center p-2 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-default">
												<HandCoins className="h-4 w-4 text-primary mb-0.5" />
												<span className="text-lg font-bold text-primary">{memberKPIs.titheMonths}<span className="text-xs font-normal text-muted-foreground">/12</span></span>
												<span className="text-[10px] text-muted-foreground leading-tight">Diezmos</span>
											</div>
										</TooltipTrigger>
										<TooltipContent>Meses diezmando este año</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex flex-col items-center p-2 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-default">
												<Church className="h-4 w-4 text-primary mb-0.5" />
												<span className="text-lg font-bold text-primary">{memberKPIs.churchYears}</span>
												<span className="text-[10px] text-muted-foreground leading-tight">Años</span>
											</div>
										</TooltipTrigger>
										<TooltipContent>Años como miembro de la iglesia</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex flex-col items-center p-2 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-default">
												<CalendarDays className="h-4 w-4 text-primary mb-0.5" />
												<span className="text-lg font-bold text-primary">{memberKPIs.totalMeetingsExpected}</span>
												<span className="text-[10px] text-muted-foreground leading-tight">Convocado</span>
											</div>
										</TooltipTrigger>
										<TooltipContent>Total de reuniones a las que fue convocado</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>

						{/* TABS - 3 secciones claras */}
						<div className="flex-grow flex flex-col min-h-0 overflow-y-auto">
							<Tabs
								value={activeTab}
								onValueChange={setActiveTab}
								className="flex flex-col h-full"
							>
								<TabsList className="mx-4 mt-3 grid grid-cols-3 flex-shrink-0 no-print">
									<TabsTrigger value="profile" className="text-xs sm:text-sm gap-1.5">
										<User className="h-3.5 w-3.5" />
										<span className="hidden sm:inline">Perfil</span>
									</TabsTrigger>
									<TabsTrigger value="attendance" className="text-xs sm:text-sm gap-1.5">
										<BookOpenCheck className="h-3.5 w-3.5" />
										<span className="hidden sm:inline">Asistencia</span>
									</TabsTrigger>
									<TabsTrigger value="tithes" className="text-xs sm:text-sm gap-1.5">
										<HandCoins className="h-3.5 w-3.5" />
										<span className="hidden sm:inline">Diezmos</span>
									</TabsTrigger>
								</TabsList>

								{/* TAB: PERFIL */}
								<TabsContent value="profile" className="flex-1 overflow-y-auto p-4 space-y-4">
									{/* Contacto Card */}
									<Card className="shadow-none border">
										<CardContent className="p-4">
											<div className="flex items-center gap-2 mb-3">
												<Mail className="h-4 w-4 text-primary" />
												<span className="text-sm font-medium">Contacto</span>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Mail className="h-3.5 w-3.5 shrink-0" />
													<span className="truncate text-foreground">{member.email}</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground">
													<Phone className="h-3.5 w-3.5 shrink-0" />
													<span className="text-foreground">{member.phone}</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
													<MapPin className="h-3.5 w-3.5 shrink-0" />
													<span className="text-foreground">{member.address || "Sin dirección"}</span>
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Participación Card */}
									<Card className="shadow-none border">
										<CardContent className="p-4">
											<div className="flex items-center gap-2 mb-3">
												<Users className="h-4 w-4 text-primary" />
												<span className="text-sm font-medium">Participación Eclesial</span>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
												<div className="space-y-1">
													<span className="text-xs text-muted-foreground uppercase tracking-wide">GDI</span>
													<p className="font-medium">{memberGDIInfo.gdiName}</p>
													{member.assignedGDIId && (
														<p className="text-xs text-muted-foreground">Guía: {memberGDIInfo.guideName}</p>
													)}
												</div>
												<div className="space-y-1">
													<span className="text-xs text-muted-foreground uppercase tracking-wide">Áreas de Ministerio</span>
													<p className="font-medium">{memberAreaNames.length > 0 ? memberAreaNames.join(", ") : "Ninguna"}</p>
												</div>
											</div>

											{/* Etiquetas Eclesiásticas */}
											{allRoleTypes.length > 0 && (
												<>
													<Separator className="my-3" />
													<div className="space-y-2">
														<div className="flex items-center justify-between">
															<span className="text-xs text-muted-foreground uppercase tracking-wide">Etiquetas Eclesiásticas</span>
															<Popover open={isRolePopoverOpen} onOpenChange={setIsRolePopoverOpen}>
																<PopoverTrigger asChild>
																	<Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1">
																		<Tag className="h-3 w-3" />
																		Asignar
																	</Button>
																</PopoverTrigger>
																<PopoverContent className="w-60 p-0" align="end">
																	<Command>
																		<CommandInput placeholder="Buscar etiqueta..." className="h-8 text-sm" />
																		<CommandList>
																			<CommandEmpty>Sin resultados.</CommandEmpty>
																			<CommandGroup>
																				{allRoleTypes.map((rt) => {
																					const assigned = localEcclesiasticalRoles.some(
																						(r) => r.roleTypeId === Number(rt.id),
																					);
																					return (
																						<CommandItem
																							key={rt.id}
																							value={rt.name}
																							onSelect={() => handleToggleEcclesiasticalRole(rt)}
																							className="flex items-center gap-2 text-sm"
																						>
																							<div className={`h-4 w-4 flex-shrink-0 border rounded flex items-center justify-center ${assigned ? "bg-primary border-primary" : "border-border"}`}>
																								{assigned && <Check className="h-3 w-3 text-primary-foreground" />}
																							</div>
																							{rt.name}
																						</CommandItem>
																					);
																				})}
																			</CommandGroup>
																		</CommandList>
																	</Command>
																</PopoverContent>
															</Popover>
														</div>
														<div className="flex flex-wrap gap-1.5 min-h-[24px]">
															{localEcclesiasticalRoles.length === 0 ? (
																<span className="text-xs text-muted-foreground italic">Ninguna asignada</span>
															) : (
																localEcclesiasticalRoles.map((er) => (
																	<Badge
																		key={er.roleTypeId}
																		variant="outline"
																		className="text-xs h-6 pl-2 pr-1 bg-primary/5 text-primary border-primary/20 gap-1"
																	>
																		{er.name}
																		<button
																			type="button"
																			onClick={() => handleToggleEcclesiasticalRole(
																				allRoleTypes.find((rt) => Number(rt.id) === er.roleTypeId) ?? { id: String(er.roleTypeId), name: er.name }
																			)}
																			className="rounded-full hover:bg-primary/20 p-0.5"
																			aria-label={`Quitar ${er.name}`}
																		>
																			<X className="h-2.5 w-2.5" />
																		</button>
																	</Badge>
																))
															)}
														</div>
													</div>
												</>
											)}
										</CardContent>
									</Card>

									{/* Formación y Fechas Card */}
									<Card className="shadow-none border">
										<CardContent className="p-4">
											<div className="flex items-center gap-2 mb-3">
												<GraduationCap className="h-4 w-4 text-primary" />
												<span className="text-sm font-medium">Fechas y Formación</span>
											</div>
											<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
												<div className="space-y-0.5">
													<span className="text-xs text-muted-foreground">Nacimiento</span>
													<p className="font-medium text-xs">{formatDate(member.birthDate)}</p>
												</div>
												<div className="space-y-0.5">
													<span className="text-xs text-muted-foreground">Ingreso</span>
													<p className="font-medium text-xs">{formatDate(member.churchJoinDate)}</p>
												</div>
												<div className="space-y-0.5">
													<span className="text-xs text-muted-foreground">Bautismo</span>
													<p className="font-medium text-xs">{baptismDate}</p>
												</div>
											</div>
											<Separator className="my-3" />
											<div className="flex flex-wrap gap-2">
												<Badge variant={member.attendsLifeSchool ? "default" : "outline"} className={`text-xs ${member.attendsLifeSchool ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground"}`}>
													{member.attendsLifeSchool ? "✓" : "○"} Escuela de Vida
												</Badge>
												<Badge variant={member.attendsBibleInstitute ? "default" : "outline"} className={`text-xs ${member.attendsBibleInstitute ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground"}`}>
													{member.attendsBibleInstitute ? "✓" : "○"} IBE
												</Badge>
												<Badge variant={member.fromAnotherChurch ? "default" : "outline"} className={`text-xs ${member.fromAnotherChurch ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground"}`}>
													{member.fromAnotherChurch ? "✓" : "○"} Otra Iglesia
												</Badge>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								{/* TAB: ASISTENCIA */}
						<TabsContent value="attendance" className="flex-1 overflow-y-auto p-4 space-y-3" id="attendance-print-section-wrapper">
							<div id="attendance-print-section">
								{/* Toolbar compacta: año + serie + imprimir */}
								<div className="flex items-center gap-2 no-print flex-wrap">
									{/* Selector de año */}
									<div className="flex items-center gap-1 rounded-md border bg-background px-1 py-0.5">
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											onClick={() => setSelectedYear((y) => y - 1)}
											aria-label="Año anterior"
										>
											<ChevronLeft className="h-3.5 w-3.5" />
										</Button>
										<span className="text-sm font-semibold w-12 text-center tabular-nums">{selectedYear}</span>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											onClick={() => setSelectedYear((y) => y + 1)}
											disabled={selectedYear >= new Date().getFullYear()}
											aria-label="Año siguiente"
										>
											<ChevronRight className="h-3.5 w-3.5" />
										</Button>
									</div>
									{/* Selector de serie */}
									<Select value={attendanceSelectedSeriesId} onValueChange={setAttendanceSelectedSeriesId}>
										<SelectTrigger className="h-8 flex-1 min-w-[160px] text-xs">
											<SelectValue placeholder="Serie..." />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Todas las series</SelectItem>
											{relevantSeriesForAttendanceDropdown.map((s) => (
												<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button onClick={handlePrintAttendance} variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Imprimir">
										<Printer className="h-4 w-4" />
									</Button>
								</div>

								{/* Mini-KPIs del período filtrado */}
								{attendanceData && (
									<div className="grid grid-cols-4 gap-2">
										<div className="rounded-lg border bg-background p-2 text-center">
											<p className="text-xl font-bold text-primary">{attendanceData.stats.attendanceRate}%</p>
											<p className="text-[10px] text-muted-foreground leading-tight">Asistencia</p>
										</div>
										<div className="rounded-lg border bg-background p-2 text-center">
											<p className="text-xl font-bold">{attendanceData.stats.convocated}</p>
											<p className="text-[10px] text-muted-foreground leading-tight">Convocado</p>
										</div>
										<div className="rounded-lg border bg-background p-2 text-center">
											<p className="text-xl font-bold text-green-700 dark:text-green-400">{attendanceData.stats.attended}</p>
											<p className="text-[10px] text-muted-foreground leading-tight">Presente</p>
										</div>
										<div className="rounded-lg border bg-background p-2 text-center">
											<p className="text-xl font-bold text-red-700 dark:text-red-400">{attendanceData.stats.absent}</p>
											<p className="text-[10px] text-muted-foreground leading-tight">Ausente</p>
										</div>
									</div>
								)}

								{/* Gráfico de barras + tabla de detalle */}
								<div className="space-y-3">
									<MemberAttendanceLineChart
										monthlyData={attendanceData?.monthlySummary ?? []}
									/>
									<MemberAttendanceSummary
										meetings={attendanceData?.meetings ?? []}
										memberName={`${member.firstName} ${member.lastName}`}
									/>
								</div>
							</div>
						</TabsContent>

								{/* TAB: DIEZMOS */}
								<TabsContent value="tithes" className="flex-1 overflow-y-auto p-4">
									{/* Filtro de rango — bloque unificado */}
									{(() => {
										const isInvalidRange =
											titheStartYear > titheEndYear ||
											(titheStartYear === titheEndYear && titheStartMonth > titheEndMonth);
										return (
											<div className="rounded-lg border border-primary/30 bg-primary/[0.07] dark:bg-primary/[0.10] px-3 py-2.5 mb-5 space-y-2">
												<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
													<CalendarDays className="h-3.5 w-3.5" />
													<span>Período analizado</span>
												</div>
												<div className="flex items-center gap-2 flex-wrap">
													<Select value={String(titheStartMonth)} onValueChange={(v) => setTitheStartMonth(Number(v))}>
														<SelectTrigger className="h-8 w-[110px] text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{MONTH_OPTIONS.map((m) => (
																<SelectItem key={m.value} value={String(m.value)} className="text-xs">{m.label}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Select value={String(titheStartYear)} onValueChange={(v) => setTitheStartYear(Number(v))}>
														<SelectTrigger className="h-8 w-[76px] text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{YEAR_OPTIONS.map((y) => (
																<SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
													<Select value={String(titheEndMonth)} onValueChange={(v) => setTitheEndMonth(Number(v))}>
														<SelectTrigger className="h-8 w-[110px] text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{MONTH_OPTIONS.map((m) => (
																<SelectItem key={m.value} value={String(m.value)} className="text-xs">{m.label}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Select value={String(titheEndYear)} onValueChange={(v) => setTitheEndYear(Number(v))}>
														<SelectTrigger className="h-8 w-[76px] text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{YEAR_OPTIONS.map((y) => (
																<SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												{isInvalidRange && (
													<p className="text-xs text-destructive font-medium">
														El mes de inicio debe ser anterior al mes de fin.
													</p>
												)}
											</div>
										);
									})()}
									<MemberTitheHistory
										memberId={member.id}
										allTitheRecords={allTitheRecords}
										startDate={startOfMonth(new Date(titheStartYear, titheStartMonth - 1, 1))}
										endDate={endOfMonth(new Date(titheEndYear, titheEndMonth - 1, 1))}
									/>
								</TabsContent>
							</Tabs>
						</div>
					</>
				)}

				{!isEditing && (
					<DialogFooter className="px-4 py-3 border-t no-print flex-row justify-between">
						<AlertDialog
							open={isDeleteDialogOpen}
							onOpenChange={setIsDeleteDialogOpen}
						>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="h-4 w-4 mr-1.5" />
									Dar de baja
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										¿Dar de baja a este miembro?
									</AlertDialogTitle>
									<AlertDialogDescription>
										<b className="text-foreground">
											{member.firstName} {member.lastName}
										</b>{" "}
										quedará archivado en la sección &quot;Dados de baja&quot;
										y podrá ser restaurado en cualquier momento.
										Su historial de asistencia y diezmos se conservará intacto.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDeleteConfirm}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{isPending ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : null}
										Dar de baja
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
						<Button
							onClick={handleCloseDialog}
							variant="outline"
							size="sm"
						>
							Cerrar
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
