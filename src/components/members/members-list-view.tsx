"use client";

import {
	AlertTriangle,
	ArrowDownNarrowWide,
	ArrowUpNarrowWide,
	Briefcase,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Eye,
	Filter,
	ListPlus,
	MoreVertical,
	Pencil,
	Search,
	ShieldCheck,
	Trash2,
	UserCheck,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type {
	AddMemberFormValues,
	AttendanceRecord,
	GDI,
	Meeting,
	MeetingSeries,
	Member,
	MemberRoleType,
	MemberWriteData,
	MinistryArea,
	TitheRecord,
} from "@/lib/types";
import type { RoleType } from "@/lib/api/mappers";
import {
	NO_AREA_FILTER_VALUE,
	NO_GDI_FILTER_VALUE,
	NO_ROLE_FILTER_VALUE,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toApiDateString } from "@/lib/utils/date";
import AddMemberForm from "./add-member-form";
import MemberDetailsDialog from "./member-details-dialog";

interface MembersListViewProps {
	initialMembers: Member[];
	allMembersForDropdowns: Member[];
	allGDIs: GDI[];
	allMinistryAreas: MinistryArea[];
	allMeetings: Meeting[];
	allMeetingSeries: MeetingSeries[];
	allAttendanceRecords: AttendanceRecord[];
	allTitheRecords: TitheRecord[];
	allRoleTypes: RoleType[];
	addSingleMemberAction: (
		newMemberData: MemberWriteData,
	) => Promise<{ success: boolean; message: string; newMember?: Member }>;
	updateMemberAction: (
		memberData: Member,
	) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
	deleteMemberAction: (
		memberId: string,
	) => Promise<{ success: boolean; message: string }>;
	currentPage: number;
	totalPages: number;
	pageSize: number;
	currentSearchTerm?: string;
	currentMemberStatusFilters?: string[];
	currentRoleFilters?: string[];
	currentGuideIdFilters?: string[];
	currentAreaFilters?: string[];
	totalMembers: number; // Filtered count
	absoluteTotalMembers: number; // Absolute total
}

type SortKey =
	| Exclude<
			keyof Member,
			| "email"
			| "assignedGDIId"
			| "assignedAreaIds"
			| "address"
			| "attendsLifeSchool"
			| "attendsBibleInstitute"
			| "fromAnotherChurch"
			| "baptismDate"
			| "roles"
	  >
	| "fullName"
	| "lastAttendance";
type SortOrder = "asc" | "desc";

// Role display names aligned with backend roles
const roleDisplayMap: Record<MemberRoleType, string> = {
	GdiGuide: "Guía GDI",
	GdiMentor: "Mentor GDI",
	AreaLeader: "Líder Área",
	AreaMentor: "Mentor Área",
	Worker: "Obrero",
};

// Role badge colors for visual distinction
const roleBadgeColors: Record<MemberRoleType, string> = {
	GdiGuide: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
	GdiMentor: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/40",
	AreaLeader: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
	AreaMentor: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/40",
	Worker: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
};

const roleFilterOptions: {
	value: MemberRoleType | typeof NO_ROLE_FILTER_VALUE;
	label: string;
}[] = [
	...Object.entries(roleDisplayMap).map(([value, label]) => ({
		value: value as MemberRoleType,
		label,
	})),
	{ value: NO_ROLE_FILTER_VALUE, label: "Sin Rol Asignado" },
];

const statusDisplayMap: Record<Member["status"], string> = {
	vigente: "Vigente",
	eliminado: "Eliminado",
};
const statusFilterOptions: { value: Member["status"]; label: string }[] =
	Object.entries(statusDisplayMap).map(([value, label]) => ({
		value: value as Member["status"],
		label,
	}));

export default function MembersListView({
	initialMembers,
	allMembersForDropdowns,
	allGDIs,
	allMinistryAreas,
	allMeetings,
	allMeetingSeries,
	allAttendanceRecords,
	allTitheRecords,
	allRoleTypes,
	addSingleMemberAction,
	updateMemberAction,
	deleteMemberAction,
	currentPage,
	totalPages,
	pageSize,
	currentSearchTerm = "",
	currentMemberStatusFilters = [],
	currentRoleFilters = [],
	currentGuideIdFilters = [],
	currentAreaFilters = [],
	totalMembers,
	absoluteTotalMembers,
}: MembersListViewProps) {
	const [members, setMembers] = useState<Member[]>(initialMembers);
	const [searchInput, setSearchInput] = useState(currentSearchTerm);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
		currentMemberStatusFilters || [],
	);
	const [selectedRoles, setSelectedRoles] = useState<string[]>(
		currentRoleFilters || [],
	);
	const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>(
		currentGuideIdFilters || [],
	);
	const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(
		currentAreaFilters || [],
	);

	const [sortKey, setSortKey] = useState<SortKey>("fullName");
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
	const [selectedMember, setSelectedMember] = useState<Member | null>(null);
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
	const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
	const [isProcessingMember, startMemberTransition] = useTransition();
	const { toast } = useToast();

	const router = useRouter();
	const pathname = usePathname();
	const searchParamsHook = useSearchParams();

	// KPI Stats calculation
	const stats = useMemo(() => {
		const activeMembers = allMembersForDropdowns.filter(m => m.status === "vigente");
		const withoutGdi = activeMembers.filter(m => !m.assignedGDIId);
		const withoutArea = activeMembers.filter(m => !m.assignedAreaIds || m.assignedAreaIds.length === 0);
		return {
			total: absoluteTotalMembers,
			active: activeMembers.length,
			withoutGdi: withoutGdi.length,
			withoutArea: withoutArea.length,
		};
	}, [allMembersForDropdowns, absoluteTotalMembers]);

	// Calculate last attendance date for each member
	const memberLastAttendance = useMemo(() => {
		const lastAttendanceMap = new Map<string, { date: Date; daysAgo: number }>();
		const now = new Date();
		
		for (const record of allAttendanceRecords) {
			if (!record.attended) continue;
			
			const meeting = allMeetings.find(m => m.id === record.meetingId);
			if (!meeting) continue;
			
			const meetingDate = new Date(meeting.date);
			const memberId = record.memberId;
			
			const existing = lastAttendanceMap.get(memberId);
			if (!existing || meetingDate > existing.date) {
				const daysAgo = Math.floor((now.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24));
				lastAttendanceMap.set(memberId, { date: meetingDate, daysAgo });
			}
		}
		
		return lastAttendanceMap;
	}, [allAttendanceRecords, allMeetings]);

	// Get attendance status color and label
	const getAttendanceStatus = useCallback((memberId: string) => {
		const attendance = memberLastAttendance.get(memberId);
		if (!attendance) {
			return { label: "Sin registro", color: "text-gray-400 dark:text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800/50", daysAgo: -1 };
		}
		const { daysAgo, date } = attendance;
		const dateStr = date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
		
		if (daysAgo <= 7) {
			return { label: dateStr, color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", daysAgo };
		} else if (daysAgo <= 30) {
			return { label: dateStr, color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", daysAgo };
		} else {
			return { label: dateStr, color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", daysAgo };
		}
	}, [memberLastAttendance]);

	useEffect(() => {
		setMembers(initialMembers);
	}, [initialMembers]);

	// Members now come enriched with GDI, Areas, and Roles from backend

	// GDI filter options - use GDI IDs directly instead of guide IDs
	const gdiFilterOptions = useMemo(() => {
		return [
			{ id: NO_GDI_FILTER_VALUE, name: "No Asignado a GDI" },
			...allGDIs.sort((a, b) => a.name.localeCompare(b.name)),
		];
	}, [allGDIs]);

	const getGdiName = useCallback(
		(member: Member): string => {
			if (!member.assignedGDIId) return "No asignado";
			const gdi = allGDIs.find((g) => g.id === member.assignedGDIId);
			return gdi ? gdi.name : "GDI no encontrado";
		},
		[allGDIs],
	);

	const areaFilterOptions: Array<{ id: string; name: string }> = useMemo(() => {
		return [
			{ id: NO_AREA_FILTER_VALUE, name: "Sin Área Asignada" },
			...allMinistryAreas.sort((a, b) => a.name.localeCompare(b.name)),
		];
	}, [allMinistryAreas]);

	const getMemberAreaNames = useCallback(
		(member: Member): string[] => {
			if (!member.assignedAreaIds || member.assignedAreaIds.length === 0)
				return [];
			return member.assignedAreaIds
				.map(
					(areaId) => allMinistryAreas.find((area) => area.id === areaId)?.name,
				)
				.filter(Boolean) as string[];
		},
		[allMinistryAreas],
	);

	const toggleFilterItem = (
		itemValue: string,
		currentSelectedArray: string[],
		setter: React.Dispatch<React.SetStateAction<string[]>>,
	) => {
		const newArray = currentSelectedArray.includes(itemValue)
			? currentSelectedArray.filter((i) => i !== itemValue)
			: [...currentSelectedArray, itemValue];
		setter(newArray);
	};

	// Auto-apply filter function - applies filters immediately
	const applyFiltersWithValues = useCallback((
		statuses: string[],
		roles: string[],
		gdiIds: string[],
		areaIds: string[],
		search: string = searchInput
	) => {
		const params = new URLSearchParams();
		params.set("page", "1");
		params.set("pageSize", pageSize.toString());

		if (search.trim()) params.set("search", search.trim());
		if (statuses.length > 0) params.set("memberStatus", statuses.join(","));
		if (roles.length > 0) params.set("role", roles.join(","));
		if (gdiIds.length > 0) params.set("guide", gdiIds.join(","));
		if (areaIds.length > 0) params.set("area", areaIds.join(","));

		router.push(`${pathname}?${params.toString()}`);
		router.refresh();
	}, [pathname, router, pageSize, searchInput]);

	// Auto-apply toggle for each filter type
	const toggleStatusFilter = (value: string) => {
		const newStatuses = selectedStatuses.includes(value)
			? selectedStatuses.filter(s => s !== value)
			: [...selectedStatuses, value];
		setSelectedStatuses(newStatuses);
		applyFiltersWithValues(newStatuses, selectedRoles, selectedGuideIds, selectedAreaIds);
	};

	const toggleRoleFilter = (value: string) => {
		const newRoles = selectedRoles.includes(value)
			? selectedRoles.filter(r => r !== value)
			: [...selectedRoles, value];
		setSelectedRoles(newRoles);
		applyFiltersWithValues(selectedStatuses, newRoles, selectedGuideIds, selectedAreaIds);
	};

	const toggleGdiFilter = (value: string) => {
		const newGdiIds = selectedGuideIds.includes(value)
			? selectedGuideIds.filter(g => g !== value)
			: [...selectedGuideIds, value];
		setSelectedGuideIds(newGdiIds);
		applyFiltersWithValues(selectedStatuses, selectedRoles, newGdiIds, selectedAreaIds);
	};

	const toggleAreaFilter = (value: string) => {
		const newAreaIds = selectedAreaIds.includes(value)
			? selectedAreaIds.filter(a => a !== value)
			: [...selectedAreaIds, value];
		setSelectedAreaIds(newAreaIds);
		applyFiltersWithValues(selectedStatuses, selectedRoles, selectedGuideIds, newAreaIds);
	};

	// Remove single filter chip
	const removeFilterChip = (type: 'status' | 'role' | 'gdi' | 'area', value: string) => {
		switch (type) {
			case 'status':
				toggleStatusFilter(value);
				break;
			case 'role':
				toggleRoleFilter(value);
				break;
			case 'gdi':
				toggleGdiFilter(value);
				break;
			case 'area':
				toggleAreaFilter(value);
				break;
		}
	};

	// Get label for filter value
	const getFilterLabel = (type: 'status' | 'role' | 'gdi' | 'area', value: string): string => {
		switch (type) {
			case 'status':
				return statusDisplayMap[value as Member["status"]] || value;
			case 'role':
				return value === NO_ROLE_FILTER_VALUE ? "Sin Rol" : (roleDisplayMap[value as MemberRoleType] || value);
			case 'gdi':
				if (value === NO_GDI_FILTER_VALUE) return "Sin GDI";
				const gdi = allGDIs.find(g => g.id === value);
				return gdi?.name || value;
			case 'area':
				if (value === NO_AREA_FILTER_VALUE) return "Sin Área";
				const area = allMinistryAreas.find(a => a.id === value);
				return area?.name || value;
			default:
				return value;
		}
	};

	const handleFilterOrSearch = () => {
		applyFiltersWithValues(selectedStatuses, selectedRoles, selectedGuideIds, selectedAreaIds);
	};

	const handleClearAllFilters = () => {
		setSearchInput("");
		setSelectedStatuses([]);
		setSelectedRoles([]);
		setSelectedGuideIds([]);
		setSelectedAreaIds([]);

		const params = new URLSearchParams();
		params.set("page", "1");
		params.set("pageSize", pageSize.toString());
		router.push(`${pathname}?${params.toString()}`);
		router.refresh();
	};

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortOrder("asc");
		}
	};

	const processedMembers = useMemo(() => {
		const membersToProcess = [...members];
		membersToProcess.sort((a, b) => {
			let valA, valB;
			if (sortKey === "fullName") {
				valA = `${a.firstName} ${a.lastName}`;
				valB = `${b.firstName} ${b.lastName}`;
			} else {
				valA = a[sortKey as keyof Member];
				valB = b[sortKey as keyof Member];
			}

			if (valA === undefined || valA === null) valA = "";
			if (valB === undefined || valB === null) valB = "";

			if (typeof valA === "string" && typeof valB === "string") {
				return sortOrder === "asc"
					? valA.localeCompare(valB)
					: valB.localeCompare(valA);
			}
			if (typeof valA === "number" && typeof valB === "number") {
				return sortOrder === "asc" ? valA - valB : valB - valA;
			}
			if (sortKey === "birthDate" || sortKey === "churchJoinDate") {
				const dateA = valA ? new Date(valA as string).getTime() : 0;
				const dateB = valB ? new Date(valB as string).getTime() : 0;
				return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
			}
			return 0;
		});
		return membersToProcess;
	}, [members, sortKey, sortOrder]);

	const handleOpenDetailsDialog = (member: Member) => {
		setSelectedMember(member);
		setIsDetailsDialogOpen(true);
	};

	const handleCloseDetailsDialog = () => {
		setIsDetailsDialogOpen(false);
		setSelectedMember(null);
	};

	const handleAddSingleMemberSubmit = async (data: AddMemberFormValues) => {
		const newMemberWriteData: MemberWriteData = {
			...data,
			email: data.email ?? "",
			// Convert Date from form to string for MemberWriteData (YYYY-MM-DD format)
			birthDate: toApiDateString(data.birthDate),
			churchJoinDate: toApiDateString(data.churchJoinDate),
			baptismDate: toApiDateString(data.baptismDate),
			roles: [],
		};

		startMemberTransition(async () => {
			const result = await addSingleMemberAction(newMemberWriteData);
			if (result.success && result.newMember) {
				toast({ title: "Éxito", description: result.message });
				setIsAddMemberDialogOpen(false);
				router.refresh();
			} else {
				toast({
					title: "Error al Agregar",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	};

	const handleMemberUpdated = (updatedMember: Member) => {
		setMembers((prevMembers) =>
			prevMembers.map((m) => (m.id === updatedMember.id ? updatedMember : m)),
		);
		router.refresh();
	};

	// Handler to open edit dialog (uses details dialog which has edit mode)
	const handleOpenEditDialog = (member: Member) => {
		setSelectedMember(member);
		setIsDetailsDialogOpen(true);
		// Note: The MemberDetailsDialog has internal edit mode that user can access
	};

	// Handler to delete a member with confirmation
	const handleDeleteMember = async (memberId: string) => {
		const memberToDelete = members.find(m => m.id === memberId);
		if (!memberToDelete) return;

		// Confirm before deleting
		const confirmed = window.confirm(
			`¿Está seguro de que desea eliminar a ${memberToDelete.firstName} ${memberToDelete.lastName}? Esta acción no se puede deshacer.`
		);
		
		if (!confirmed) return;

		startMemberTransition(async () => {
			const result = await deleteMemberAction(memberId);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				setMembers(prevMembers => prevMembers.filter(m => m.id !== memberId));
				router.refresh();
			} else {
				toast({
					title: "Error al Eliminar",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	};

	const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
		if (sortKey !== columnKey) return null;
		return sortOrder === "asc" ? (
			<ArrowUpNarrowWide size={16} />
		) : (
			<ArrowDownNarrowWide size={16} />
		);
	};

	const displayStatus = (status: Member["status"]) =>
		statusDisplayMap[status] || status;

	const createPageURL = (pageNumber: number) => {
		const params = new URLSearchParams(searchParamsHook.toString());
		params.set("page", pageNumber.toString());
		return `${pathname}?${params.toString()}`;
	};

	const handlePageSizeChange = (newSize: string) => {
		const params = new URLSearchParams(searchParamsHook.toString());
		params.set("pageSize", newSize);
		params.set("page", "1");
		router.push(`${pathname}?${params.toString()}`);
		router.refresh();
	};

	const hasActiveFilters =
		searchInput.trim() !== "" ||
		selectedStatuses.length > 0 ||
		selectedRoles.length > 0 ||
		selectedGuideIds.length > 0 ||
		selectedAreaIds.length > 0;

	return (
		<>
			{/* KPI Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<Card className="border-l-4 border-l-primary">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<Users className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.total}</p>
								<p className="text-xs text-muted-foreground">Total Miembros</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-green-500">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
								<UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.active}</p>
								<p className="text-xs text-muted-foreground">Vigentes</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className={cn("border-l-4", stats.withoutGdi > 0 ? "border-l-warning" : "border-l-green-500")}>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", stats.withoutGdi > 0 ? "bg-warning/20" : "bg-green-100 dark:bg-green-900/30")}>
								<AlertTriangle className={cn("h-5 w-5", stats.withoutGdi > 0 ? "text-warning" : "text-green-600")} />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.withoutGdi}</p>
								<p className="text-xs text-muted-foreground">Sin GDI</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className={cn("border-l-4", stats.withoutArea > 0 ? "border-l-warning" : "border-l-green-500")}>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", stats.withoutArea > 0 ? "bg-warning/20" : "bg-green-100 dark:bg-green-900/30")}>
								<AlertTriangle className={cn("h-5 w-5", stats.withoutArea > 0 ? "text-warning" : "text-green-600")} />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.withoutArea}</p>
								<p className="text-xs text-muted-foreground">Sin Área</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="mb-6 space-y-4">
				<div className="flex flex-col md:flex-row justify-between items-center gap-4">
					<div className="w-full md:w-auto md:flex-grow md:max-w-sm">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleFilterOrSearch();
							}}
							className="relative"
						>
							<Label htmlFor="memberSearchInput" className="sr-only">
								Buscar Miembro
							</Label>
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
							<Input
								id="memberSearchInput"
								type="search"
								placeholder="Buscar por nombre, email..."
								className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-primary focus:border-primary"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
							/>
							<button type="submit" className="hidden" />
						</form>
					</div>
					{/* Unified Add Button with Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button disabled={isProcessingMember}>
								<UserPlus className="mr-2 h-4 w-4" /> Agregar Miembro
								<ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setIsAddMemberDialogOpen(true)}>
								<UserPlus className="mr-2 h-4 w-4" />
								Agregar Individual
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/members/bulk-add">
									<ListPlus className="mr-2 h-4 w-4" />
									Agregar Múltiples
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex flex-wrap items-center gap-x-2 gap-y-2 py-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary data-[state=open]:text-primary"
							>
								<Filter className="mr-2 h-3.5 w-3.5" />
								<span>
									{selectedStatuses.length > 0
										? `Estado (${selectedStatuses.length})`
										: "Estado"}
								</span>
								<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{statusFilterOptions.map((opt) => (
								<DropdownMenuCheckboxItem
									key={opt.value}
									checked={selectedStatuses.includes(opt.value)}
									onCheckedChange={() => toggleStatusFilter(opt.value)}
								>
									{opt.label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary data-[state=open]:text-primary"
							>
								<ShieldCheck className="mr-2 h-3.5 w-3.5" />
								<span>
									{selectedRoles.length > 0
										? `Rol (${selectedRoles.length})`
										: "Rol"}
								</span>
								<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuLabel>Filtrar por Rol</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{roleFilterOptions.map((opt) => (
								<DropdownMenuCheckboxItem
									key={opt.value}
									checked={selectedRoles.includes(opt.value)}
									onCheckedChange={() => toggleRoleFilter(opt.value)}
								>
									{opt.label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary data-[state=open]:text-primary"
							>
								<Users className="mr-2 h-3.5 w-3.5" />
								<span>
									{selectedGuideIds.length > 0
										? `GDI (${selectedGuideIds.length})`
										: "GDI"}
								</span>
								<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64 p-0">
							<Command>
								<CommandInput
									placeholder="Buscar GDI..."
									className="h-9 border-0 shadow-none focus-visible:ring-0"
								/>
								<CommandList className="max-h-60">
									<CommandEmpty>No se encontró el GDI.</CommandEmpty>
									<DropdownMenuLabel className="px-2 pt-2 text-xs">
										Filtrar por GDI
									</DropdownMenuLabel>
									<DropdownMenuSeparator className="mx-1 my-1" />
									<CommandGroup>
										{gdiFilterOptions.map((gdi) => (
											<CommandItem
												key={gdi.id}
												value={gdi.name}
												onSelect={() => toggleGdiFilter(gdi.id)}
												className="text-xs cursor-pointer"
											>
												<div className="flex items-center w-full">
													<Check
														className={cn(
															"mr-2 h-3.5 w-3.5",
															selectedGuideIds.includes(gdi.id)
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													<span className="truncate">
														{gdi.name}
													</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
									{gdiFilterOptions.length === 1 &&
										gdiFilterOptions[0].id === NO_GDI_FILTER_VALUE && (
											<CommandItem
												disabled
												className="text-xs text-muted-foreground text-center py-2"
											>
												No hay GDIs para mostrar
											</CommandItem>
										)}
								</CommandList>
							</Command>
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary data-[state=open]:text-primary"
							>
								<Briefcase className="mr-2 h-3.5 w-3.5" />
								<span>
									{selectedAreaIds.length > 0
										? `Área (${selectedAreaIds.length})`
										: "Área"}
								</span>
								<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64 p-0">
							<Command>
								<CommandInput
									placeholder="Buscar Área..."
									className="h-9 border-0 shadow-none focus-visible:ring-0"
								/>
								<CommandList className="max-h-60">
									<CommandEmpty>No se encontró el Área.</CommandEmpty>
									<DropdownMenuLabel className="px-2 pt-2 text-xs">
										Filtrar por Área Ministerial
									</DropdownMenuLabel>
									<DropdownMenuSeparator className="mx-1 my-1" />
									<CommandGroup>
										{areaFilterOptions.map((area) => (
											<CommandItem
												key={area.id}
												value={area.name}
												onSelect={() => toggleAreaFilter(area.id)}
												className="text-xs cursor-pointer"
											>
												<div className="flex items-center w-full">
													<Check
														className={cn(
															"mr-2 h-3.5 w-3.5",
															selectedAreaIds.includes(area.id)
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													<span className="truncate">{area.name}</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</DropdownMenuContent>
					</DropdownMenu>

					{hasActiveFilters && (
						<Button
							onClick={handleClearAllFilters}
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-destructive ml-auto"
						>
							<X className="mr-1 h-3.5 w-3.5" /> Limpiar filtros
						</Button>
					)}
				</div>

				{/* Active Filters Chips */}
				{hasActiveFilters && (
					<div className="flex flex-wrap gap-2 pb-4">
						{selectedStatuses.map(status => (
							<Badge
								key={`status-${status}`}
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('status', status)}
							>
								Estado: {getFilterLabel('status', status)}
								<X className="h-3 w-3" />
							</Badge>
						))}
						{selectedRoles.map(role => (
							<Badge
								key={`role-${role}`}
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('role', role)}
							>
								Rol: {getFilterLabel('role', role)}
								<X className="h-3 w-3" />
							</Badge>
						))}
						{selectedGuideIds.map(gdiId => (
							<Badge
								key={`gdi-${gdiId}`}
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('gdi', gdiId)}
							>
								GDI: {getFilterLabel('gdi', gdiId)}
								<X className="h-3 w-3" />
							</Badge>
						))}
						{selectedAreaIds.map(areaId => (
							<Badge
								key={`area-${areaId}`}
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('area', areaId)}
							>
								Área: {getFilterLabel('area', areaId)}
								<X className="h-3 w-3" />
							</Badge>
						))}
					</div>
				)}
			</div>

			<div className="overflow-x-auto bg-card rounded-lg shadow-md">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead
								onClick={() => handleSort("fullName")}
								className="cursor-pointer"
							>
								<div className="flex items-center gap-1 hover:text-primary">
									Miembro <SortIcon columnKey="fullName" />
								</div>
							</TableHead>
							{/* Columna Teléfono - Oculta temporalmente. Descomentar para reactivar:
							<TableHead>Teléfono</TableHead>
							*/}
							<TableHead>GDI</TableHead>
							<TableHead>Áreas</TableHead>
							<TableHead>Roles</TableHead>
							<TableHead
								onClick={() => handleSort("lastAttendance" as SortKey)}
								className="cursor-pointer"
							>
								<div className="flex items-center gap-1 hover:text-primary">
									Última Asistencia
								</div>
							</TableHead>
							<TableHead
								onClick={() => handleSort("status")}
								className="cursor-pointer"
							>
								<div className="flex items-center gap-1 hover:text-primary">
									Estado <SortIcon columnKey="status" />
								</div>
							</TableHead>
							<TableHead className="text-center w-[60px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{processedMembers.map((member) => {
							const memberAreas = getMemberAreaNames(member);
							const isDeleted = member.status === "eliminado";
							const attendanceStatus = getAttendanceStatus(member.id);
							return (
								<TableRow
									key={member.id}
									onClick={() => handleOpenDetailsDialog(member)}
									className={cn(
										"hover:bg-muted/50 transition-colors cursor-pointer",
										isDeleted && "opacity-50"
									)}
								>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarFallback className="text-xs">
													{member.firstName.substring(0, 1)}
													{member.lastName.substring(0, 1)}
												</AvatarFallback>
											</Avatar>
											<span className={cn("font-medium", isDeleted && "line-through")}>
												{member.firstName} {member.lastName}
											</span>
										</div>
									</TableCell>
									{/* Columna Teléfono - Oculta temporalmente. Descomentar para reactivar:
									<TableCell>{member.phone}</TableCell>
									*/}
									<TableCell>
										<span className={cn(
											"text-sm",
											!member.assignedGDIId && "text-yellow-600 font-medium"
										)}>
											{getGdiName(member)}
										</span>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1 max-w-xs">
											{memberAreas.length > 0 ? (
												memberAreas.slice(0, 2).map((areaName) => (
													<Badge
														key={areaName}
														variant="outline"
														className="text-xs whitespace-nowrap"
													>
														{areaName}
													</Badge>
												))
											) : (
												<span className="text-xs text-yellow-600">
													Sin área
												</span>
											)}
											{memberAreas.length > 2 && (
												<Badge variant="secondary" className="text-xs">
													+{memberAreas.length - 2}
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{member.roles && member.roles.length > 0 ? (
												member.roles.map((role) => (
													<Badge
														key={role}
											className={cn("text-xs border", roleBadgeColors[role] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")}
													>
														{roleDisplayMap[role] || role}
													</Badge>
												))
											) : (
												<span className="text-xs text-muted-foreground">
													—
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className={cn(
											"inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
											attendanceStatus.bgColor,
											attendanceStatus.color
										)}>
											{attendanceStatus.daysAgo >= 0 && attendanceStatus.daysAgo <= 7 && (
												<span className="w-2 h-2 rounded-full bg-green-500" />
											)}
											{attendanceStatus.daysAgo > 7 && attendanceStatus.daysAgo <= 30 && (
												<span className="w-2 h-2 rounded-full bg-yellow-500" />
											)}
											{attendanceStatus.daysAgo > 30 && (
												<span className="w-2 h-2 rounded-full bg-red-500" />
											)}
											{attendanceStatus.label}
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant={
												member.status === "vigente"
													? "default"
													: "secondary"
											}
											className={
												member.status === "vigente"
													? "bg-green-500/20 text-green-700 border-green-500/50 dark:text-green-400"
													: "bg-red-500/20 text-red-700 border-red-500/50 dark:text-red-400"
											}
										>
											{displayStatus(member.status)}
										</Badge>
									</TableCell>
									<TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													disabled={isProcessingMember}
												>
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleOpenDetailsDialog(member)}>
													<Eye className="mr-2 h-4 w-4" />
													Ver Detalles
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleOpenEditDialog(member)}>
													<Pencil className="mr-2 h-4 w-4" />
													Editar
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleDeleteMember(member.id)}
													className="text-destructive focus:text-destructive"
													disabled={member.status === "eliminado"}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Eliminar
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
			{processedMembers.length === 0 && hasActiveFilters && (
				<p className="text-center text-muted-foreground mt-8">
					No se encontraron miembros con los filtros aplicados.
				</p>
			)}
			{initialMembers.length === 0 && !hasActiveFilters && (
				<p className="text-center text-muted-foreground mt-8">
					No hay miembros para mostrar.
				</p>
			)}

			{totalPages > 0 && (
				<div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 py-4">
					<div className="text-sm text-muted-foreground">
						{totalMembers}{" "}
						{totalMembers === 1 ? "miembro encontrado" : "miembros encontrados"}{" "}
						(de {absoluteTotalMembers} en total). Página {currentPage} de{" "}
						{totalPages}
					</div>
					<div className="flex items-center space-x-2">
						<div className="flex items-center space-x-1">
							<span className="text-sm text-muted-foreground">Mostrar:</span>
							<Select
								value={pageSize.toString()}
								onValueChange={handlePageSizeChange}
							>
								<SelectTrigger
									id="memberPageSizeSelect"
									className="w-[70px] h-8 text-xs"
								>
									<SelectValue placeholder={pageSize.toString()} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="10">10</SelectItem>
									<SelectItem value="25">25</SelectItem>
									<SelectItem value="50">50</SelectItem>
									<SelectItem value="100">100</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => router.push(createPageURL(currentPage - 1))}
							disabled={currentPage <= 1 || isProcessingMember}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => router.push(createPageURL(currentPage + 1))}
							disabled={currentPage >= totalPages || isProcessingMember}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			{selectedMember && (
				<MemberDetailsDialog
					member={selectedMember}
					allMembers={allMembersForDropdowns}
					allGDIs={allGDIs}
					allMinistryAreas={allMinistryAreas}
					allMeetings={allMeetings}
					allMeetingSeries={allMeetingSeries}
					allAttendanceRecords={allAttendanceRecords}
					allTitheRecords={allTitheRecords}
					allRoleTypes={allRoleTypes}
					isOpen={isDetailsDialogOpen}
					onClose={handleCloseDetailsDialog}
					onMemberUpdated={handleMemberUpdated}
					updateMemberAction={updateMemberAction}
					deleteMemberAction={deleteMemberAction}
				/>
			)}
			<Dialog
				open={isAddMemberDialogOpen}
				onOpenChange={setIsAddMemberDialogOpen}
			>
				<DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
					<DialogHeader className="p-6 border-b sticky top-0 bg-background z-10">
						<DialogTitle>Agregar Nuevo Miembro</DialogTitle>
						<DialogDescription>
							Complete los detalles del nuevo miembro de la iglesia. Haga clic
							en &quot;Agregar Miembro&quot; cuando haya terminado.
						</DialogDescription>
					</DialogHeader>
					<div className="flex-grow overflow-y-auto">
						<AddMemberForm
							onSubmitMember={handleAddSingleMemberSubmit}
							allGDIs={allGDIs}
							allMinistryAreas={allMinistryAreas}
							allMembers={allMembersForDropdowns}
							submitButtonText="Agregar Miembro"
							cancelButtonText="Cancelar"
							onDialogClose={() => setIsAddMemberDialogOpen(false)}
							isSubmitting={isProcessingMember}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
