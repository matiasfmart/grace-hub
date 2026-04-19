"use client";

import { differenceInYears, endOfDay, parseISO, startOfYear } from "date-fns";
import {
	BookOpenCheck,
	Building2,
	CalendarDays,
	Check,
	Church,
	Filter as FilterIcon,
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
import { DatePicker } from "@/components/ui/date-picker";
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
import { Label } from "@/components/ui/label";
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
import { membersService } from "@/lib/api/services";
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
	deleteMemberAction: (
		memberId: string,
	) => Promise<{ success: boolean; message: string }>;
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
	deleteMemberAction,
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
	const [attendanceStartDate, setAttendanceStartDate] = useState<
		Date | undefined
	>(undefined);
	const [attendanceEndDate, setAttendanceEndDate] = useState<Date | undefined>(
		undefined,
	);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const dialogContentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen) {
			setAttendanceSelectedSeriesId("all");
			const now = new Date();
			setAttendanceStartDate(startOfYear(now));
			setAttendanceEndDate(endOfDay(now));
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

	// Calculate KPIs for the member
	const memberKPIs = useMemo(() => {
		if (!member) return { attendanceRate: 0, titheMonths: 0, churchYears: 0, totalMeetingsExpected: 0 };

		// Calculate attendance rate
		const memberExpectedMeetings = allMeetings.filter((meeting) => 
			meeting.attendeeUids?.includes(member.id)
		);
		const memberAttendanceRecords = allAttendanceRecords.filter(
			(record) => record.memberId === member.id && record.attended
		);
		const attendanceRate = memberExpectedMeetings.length > 0
			? Math.round((memberAttendanceRecords.length / memberExpectedMeetings.length) * 100)
			: 0;

		// Calculate tithe months (this year)
		const currentYear = new Date().getFullYear();
		const titheMonths = allTitheRecords.filter(
			(record) => record.memberId === member.id && record.year === currentYear
		).length;

		// Calculate years in church
		let churchYears = 0;
		if (member.churchJoinDate) {
			const joinDate = parseISO(member.churchJoinDate);
			churchYears = differenceInYears(new Date(), joinDate);
		}

		return {
			attendanceRate,
			titheMonths,
			churchYears,
			totalMeetingsExpected: memberExpectedMeetings.length,
		};
	}, [member, allMeetings, allAttendanceRecords, allTitheRecords]);

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

		const relevantSeriesIds = new Set<string>();

		allMeetings.forEach((meeting) => {
			if (meeting.attendeeUids?.includes(member.id)) {
				// Changed member.id to member._id
				relevantSeriesIds.add(meeting.seriesId);
			}
		});

		allMeetingSeries.forEach((series) => {
			if (
				series.seriesType === "general" &&
				(series.targetAttendeeGroups || []).includes("allMembers")
			) {
				relevantSeriesIds.add(series.id); // Changed series.id to series._id
			}
		});

		return allMeetingSeries
			.filter((series) => relevantSeriesIds.has(series.id)) // Changed series.id to series._id
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [allMeetings, allMeetingSeries, member]);

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
			if (isCurrentlyAssigned) {
				await membersService.removeRoleType(member.id, roleTypeId);
			} else {
				await membersService.assignRoleType(member.id, roleTypeId);
			}
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

	const handleDeleteConfirm = () => {
		if (!member) return;

		startTransition(async () => {
			const result = await deleteMemberAction(member.id);
			if (result.success) {
				toast({
					title: "Miembro Eliminado",
					description: result.message,
				});
				setIsDeleteDialogOpen(false);
				onClose(); // Close the main details dialog
				// The parent component will trigger a router.refresh()
			} else {
				toast({
					title: "Error al Eliminar",
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
					<div className="flex items-center justify-between">
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
												? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs h-5"
												: "bg-red-50 text-red-700 border-red-200 text-xs h-5"
										}
									>
										{displayStatus(member.status)}
									</Badge>
									{member.roles && member.roles.slice(0, 2).map((role) => (
										<Badge
											key={role}
											variant="outline"
											className={`text-xs h-5 ${roleBadgeColors[role] || "bg-gray-100 text-gray-700"}`}
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
								<TabsContent value="attendance" className="flex-1 overflow-y-auto p-4 space-y-4" id="attendance-print-section-wrapper">
									<div id="attendance-print-section">
										{/* Filtros */}
										<Card className="shadow-none border no-print">
											<CardContent className="p-4">
												<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
													<div className="flex items-center gap-2">
														<FilterIcon className="h-4 w-4 text-primary" />
														<span className="text-sm font-medium">Filtros</span>
													</div>
													<Button onClick={handlePrintAttendance} variant="outline" size="sm" className="h-8">
														<Printer className="h-3.5 w-3.5 mr-1.5" />
														Imprimir
													</Button>
												</div>
												<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
													<div>
														<Label className="text-xs text-muted-foreground">Serie</Label>
														<Select value={attendanceSelectedSeriesId} onValueChange={setAttendanceSelectedSeriesId}>
															<SelectTrigger className="h-9 mt-1">
																<SelectValue placeholder="Seleccionar..." />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="all">Todas las Series</SelectItem>
																{relevantSeriesForAttendanceDropdown.map((series) => (
																	<SelectItem key={series.id} value={series.id}>{series.name}</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
													<div>
														<Label className="text-xs text-muted-foreground">Desde</Label>
														<DatePicker date={attendanceStartDate} setDate={setAttendanceStartDate} placeholder="Inicio" />
													</div>
													<div>
														<Label className="text-xs text-muted-foreground">Hasta</Label>
														<DatePicker date={attendanceEndDate} setDate={setAttendanceEndDate} placeholder="Fin" />
													</div>
												</div>
												{(attendanceStartDate || attendanceEndDate) && (
													<Button
														onClick={() => {
															const now = new Date();
															setAttendanceStartDate(startOfYear(now));
															setAttendanceEndDate(endOfDay(now));
														}}
														variant="link"
														size="sm"
														className="px-0 text-xs h-auto mt-2"
													>
														Limpiar filtros
													</Button>
												)}
											</CardContent>
										</Card>

										{/* Gráficos de Asistencia */}
										<div className="space-y-4 mt-4">
											<MemberAttendanceLineChart
												memberId={member.id}
												memberName={`${member.firstName} ${member.lastName}`}
												allMeetings={allMeetings}
												allMeetingSeries={allMeetingSeries}
												allAttendanceRecords={allAttendanceRecords}
												selectedSeriesId={attendanceSelectedSeriesId}
												startDate={attendanceStartDate}
												endDate={attendanceEndDate}
											/>
											<MemberAttendanceSummary
												memberId={member.id}
												memberName={`${member.firstName} ${member.lastName}`}
												allMeetings={allMeetings}
												allMeetingSeries={allMeetingSeries}
												allAttendanceRecords={allAttendanceRecords}
												selectedSeriesId={attendanceSelectedSeriesId}
												startDate={attendanceStartDate}
												endDate={attendanceEndDate}
											/>
										</div>
									</div>
								</TabsContent>

								{/* TAB: DIEZMOS */}
								<TabsContent value="tithes" className="flex-1 overflow-y-auto p-4">
									<MemberTitheHistory
										memberId={member.id}
										allTitheRecords={allTitheRecords}
										startDate={attendanceStartDate}
										endDate={attendanceEndDate}
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
									Eliminar
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										¿Está absolutamente seguro?
									</AlertDialogTitle>
									<AlertDialogDescription>
										Esta acción no se puede deshacer. Esto eliminará
										permanentemente al miembro{" "}
										<b className="text-foreground">
											{member.firstName} {member.lastName}
										</b>{" "}
										y todos sus datos asociados (asistencia, roles, etc.).
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
										Sí, eliminar miembro
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
