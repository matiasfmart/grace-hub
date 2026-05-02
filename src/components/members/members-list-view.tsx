"use client";

import {
	AlertTriangle,
	ArrowDownNarrowWide,
	ArrowUpNarrowWide,
	Briefcase,
	Calendar,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Info,
	ListPlus,
	Search,
	ShieldCheck,
	Smile,
	Tag,
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
	useRef,
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
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
	allRoleTypes: RoleType[];
	addSingleMemberAction: (
		newMemberData: MemberWriteData,
	) => Promise<{ success: boolean; message: string; newMember?: Member }>;
	updateMemberAction: (
		memberData: Member,
	) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
	softDeleteMemberAction: (
		memberId: string,
	) => Promise<{ success: boolean; message: string }>;
	currentPage: number;
	totalPages: number;
	pageSize: number;
	currentSearchTerm?: string;
	currentRoleFilters?: string[];
	currentGuideIdFilters?: string[];
	currentAreaFilters?: string[];
	currentLabelFilters?: number[];
	currentJoinPreset?: string;
	currentAgePreset?: string;
	/** YYYY-MM — used when joinPreset === "custom" */
	currentJoinFrom?: string;
	/** YYYY-MM — used when joinPreset === "custom" */
	currentJoinTo?: string;
	/** used when agePreset === "custom" */
	currentAgeMin?: number;
	/** used when agePreset === "custom" */
	currentAgeMax?: number;
	totalMembers: number;
	absoluteTotalMembers: number;
	currentSortBy?: SortKey;
	currentSortOrder?: SortOrder;
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
	GdiGuide: "bg-primary/10 text-primary border-primary/20",
	GdiMentor: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/40",
	AreaLeader: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
	AreaMentor: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/40",
	Worker: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
};

// ─── Nivel operativo (ADR-004) ─────────────────────────────────────────────
export type OperativeLevel = 0 | 1 | 2 | 3 | 4;

function calculateOperativeLevel(member: Member): OperativeLevel {
	const roles = member.roles ?? [];
	if (roles.includes("GdiMentor") || roles.includes("AreaMentor")) return 4;
	if (roles.includes("GdiGuide") || roles.includes("AreaLeader")) return 3;
	if (roles.includes("Worker")) return 2;
	if (member.assignedGDIId) return 1;
	return 0;
}

/**
 * Returns a label listing ALL structural roles the member holds, in hierarchy order.
 * The dot/badge color reflects the highest level (calculateOperativeLevel), but the
 * text enumerates every role so the label always matches the active filter vocabulary.
 *
 * Examples:
 *   GdiMentor + AreaLeader          → "Mentor GDI · Líder Área"
 *   GdiMentor + GdiGuide            → "Mentor GDI · Guía GDI"
 *   GdiMentor + AreaMentor + GdiGuide → "Mentor GDI · Mentor Área · Guía GDI"
 *   GdiGuide only                   → "Guía GDI"
 *   Worker                          → "Obrero"
 *   Member (GDI, no role)           → "Miembro"
 *   Unassigned                      → "No integrado"
 */
function getOperativeLevelLabel(member: Member): string {
	const roles = member.roles ?? [];
	const parts: string[] = [];

	// Enumerate all structural roles in descending hierarchy order
	if (roles.includes("GdiMentor"))  parts.push("Mentor GDI");
	if (roles.includes("AreaMentor")) parts.push("Mentor Área");
	if (roles.includes("GdiGuide"))   parts.push("Guía GDI");
	if (roles.includes("AreaLeader")) parts.push("Líder Área");
	if (roles.includes("Worker"))     parts.push("Obrero");

	if (parts.length > 0) return parts.join(" · ");

	// No structural role — fall back to membership level
	const level = calculateOperativeLevel(member);
	return operativeLevelConfig[level].label;
}

const operativeLevelConfig: Record<OperativeLevel, {
	label: string;
	badgeClass: string;
	dotClass: string;
	avatarClass: string;
}> = {
	4: {
		label: "Mentor",
		badgeClass: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
		dotClass: "bg-purple-500",
		avatarClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
	},
	3: {
		label: "Líder",
		badgeClass: "bg-primary/10 text-primary border-primary/20",
		dotClass: "bg-primary",
		avatarClass: "bg-primary/10 text-primary",
	},
	2: {
		label: "Obrero",
		badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
		dotClass: "bg-emerald-500",
		avatarClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
	},
	1: {
		label: "Miembro",
		badgeClass: "bg-muted text-muted-foreground border-border",
		dotClass: "bg-muted-foreground/50",
		avatarClass: "bg-muted text-muted-foreground",
	},
	0: {
		label: "No integrado",
		badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
		dotClass: "bg-orange-500",
		avatarClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
	},
};

// Nivel filter options — maps pastoral vocabulary to backend role sentinel values.
// Multiple backend values for a single UI level use OR semantics (already supported
// by buildFilterConditions in member.repository.impl.ts).
// Level 1 "Miembro" (GDI sin rol) omitted: no backend sentinel exists yet.
const nivelFilterOptions: {
	value: string;
	label: string;
	backendValues: string[];
}[] = [
	{ value: "no-role-assigned", label: "No integrado",  backendValues: ["no-role-assigned"] },
	{ value: "Worker",           label: "Obrero",        backendValues: ["Worker"] },
	{ value: "Lider",            label: "Líder",         backendValues: ["GdiGuide", "AreaLeader"] },
	{ value: "Mentor",           label: "Mentor",        backendValues: ["GdiMentor", "AreaMentor"] },
];

// Converts an array of backend role values (from URL params) to nivel UI keys.
// Example: ["GdiGuide", "AreaLeader"] → ["Lider"]
// Example: ["Worker", "GdiMentor"]   → ["Worker", "Mentor"]
function backendRolesToNivelKeys(backendRoles: string[]): string[] {
	const nivelKeys = new Set<string>();
	for (const nivel of nivelFilterOptions) {
		const matches = nivel.backendValues.some(bv => backendRoles.includes(bv));
		if (matches) nivelKeys.add(nivel.value);
	}
	return Array.from(nivelKeys);
}

const statusDisplayMap: Record<Member["status"], string> = {
	vigente: "Activo",
	eliminado: "Dado de baja",
};

// ---- Join date presets ----
interface JoinPreset { value: string; label: string; }
const JOIN_PRESETS: JoinPreset[] = [
	{ value: "month",  label: "Este mes" },
	{ value: "3m",     label: "Últimos 3 meses" },
	{ value: "6m",     label: "Últimos 6 meses" },
	{ value: "year",   label: "Este año" },
	{ value: "custom", label: "Rango personalizado..." },
];

// ---- Age range presets ----
interface AgePreset { value: string; label: string; }
const AGE_PRESETS: AgePreset[] = [
	{ value: "kids",   label: "Niños (0–12)" },
	{ value: "teen",   label: "Adolescentes (13–17)" },
	{ value: "youth",  label: "Jóvenes (18–29)" },
	{ value: "adult",  label: "Adultos (30–59)" },
	{ value: "senior", label: "Adultos mayores (60+)" },
	{ value: "custom", label: "Rango personalizado..." },
];

const MONTHS = [
	{ value: "01", label: "Enero" },
	{ value: "02", label: "Febrero" },
	{ value: "03", label: "Marzo" },
	{ value: "04", label: "Abril" },
	{ value: "05", label: "Mayo" },
	{ value: "06", label: "Junio" },
	{ value: "07", label: "Julio" },
	{ value: "08", label: "Agosto" },
	{ value: "09", label: "Septiembre" },
	{ value: "10", label: "Octubre" },
	{ value: "11", label: "Noviembre" },
	{ value: "12", label: "Diciembre" },
];

const CURRENT_YEAR = new Date().getFullYear();
const JOIN_YEARS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR - i));

function formatMonthYear(ym: string): string {
	if (!ym) return "";
	const [year, month] = ym.split("-");
	const m = MONTHS.find(x => x.value === month);
	return m ? `${m.label.substring(0, 3)} ${year}` : ym;
}

export default function MembersListView({
	initialMembers,
	allMembersForDropdowns,
	allGDIs,
	allMinistryAreas,
	allMeetings,
	allMeetingSeries,
	allAttendanceRecords,
	allRoleTypes,
	addSingleMemberAction,
	updateMemberAction,
	softDeleteMemberAction,
	currentPage,
	totalPages,
	pageSize,
	currentSearchTerm = "",
	currentRoleFilters = [],
	currentGuideIdFilters = [],
	currentAreaFilters = [],
	currentLabelFilters = [],
	currentJoinPreset = "",
	currentAgePreset = "",
	currentJoinFrom = "",
	currentJoinTo = "",
	currentAgeMin,
	currentAgeMax,
	totalMembers,
	absoluteTotalMembers,
	currentSortBy,
	currentSortOrder,
}: MembersListViewProps) {
	const [members, setMembers] = useState<Member[]>(initialMembers);
	const [searchInput, setSearchInput] = useState(currentSearchTerm);
	const [selectedRoles, setSelectedRoles] = useState<string[]>(
		backendRolesToNivelKeys(currentRoleFilters || [])
	);
	const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>(currentGuideIdFilters || []);
	const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(currentAreaFilters || []);
	const [selectedLabels, setSelectedLabels] = useState<number[]>(currentLabelFilters || []);
	const [selectedJoinPreset, setSelectedJoinPreset] = useState<string>(currentJoinPreset);
	const [selectedAgePreset, setSelectedAgePreset] = useState<string>(currentAgePreset);
	// Custom join range state (YYYY-MM format each)
	const [customJoinFrom, setCustomJoinFrom] = useState<string>(currentJoinFrom);
	const [customJoinTo, setCustomJoinTo] = useState<string>(currentJoinTo);
	// Custom age range state
	const [customAgeMin, setCustomAgeMin] = useState<string>(currentAgeMin !== undefined ? String(currentAgeMin) : "");
	const [customAgeMax, setCustomAgeMax] = useState<string>(currentAgeMax !== undefined ? String(currentAgeMax) : "");
	const [sortKey, setSortKey] = useState<SortKey>(currentSortBy ?? "fullName");
	const [sortOrder, setSortOrder] = useState<SortOrder>(currentSortOrder ?? "asc");
	const [selectedMember, setSelectedMember] = useState<Member | null>(null);
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
	const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
	const [softDeletePendingMember, setSoftDeletePendingMember] = useState<Member | null>(null);
	const [isProcessingMember, startMemberTransition] = useTransition();
	const { toast } = useToast();
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const isSearchPendingRef = useRef(false);

	const router = useRouter();
	const pathname = usePathname();
	const searchParamsHook = useSearchParams();

	// KPI Stats calculation — based on vigente members only
	const stats = useMemo(() => {
		const activeMembers = allMembersForDropdowns.filter(m => m.status === "vigente");
		const withoutGdi = activeMembers.filter(m => calculateOperativeLevel(m) === 0);
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
			return { label: "Sin registro", color: "text-muted-foreground/60", bgColor: "bg-muted", daysAgo: -1 };
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
		if (isSearchPendingRef.current) {
			isSearchPendingRef.current = false;
			searchInputRef.current?.focus();
		}
	}, [initialMembers]);

	useEffect(() => {
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		};
	}, []);

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

	// Auto-apply filter function — main table always shows vigente members
	const applyFiltersWithValues = useCallback((
		roles: string[],
		gdiIds: string[],
		areaIds: string[],
		joinPreset: string = selectedJoinPreset,
		agePreset: string = selectedAgePreset,
		search: string = searchInput,
		labels: number[] = selectedLabels,
	) => {
		const params = new URLSearchParams();
		params.set("page", "1");
		params.set("pageSize", pageSize.toString());
		params.set("memberStatus", "vigente");

		if (search.trim()) params.set("search", search.trim());
		if (roles.length > 0) params.set("role", roles.join(","));
		if (gdiIds.length > 0) params.set("guide", gdiIds.join(","));
		if (areaIds.length > 0) params.set("area", areaIds.join(","));
		if (labels.length > 0) params.set("label", labels.join(","));
		if (joinPreset) {
			params.set("joinPreset", joinPreset);
			if (joinPreset === "custom" && customJoinFrom) params.set("joinFrom", customJoinFrom);
			if (joinPreset === "custom" && customJoinTo) params.set("joinTo", customJoinTo);
		}
		if (agePreset) {
			params.set("agePreset", agePreset);
			if (agePreset === "custom" && customAgeMin) params.set("ageMin", customAgeMin);
			if (agePreset === "custom" && customAgeMax) params.set("ageMax", customAgeMax);
		}
		// Preserve current sort
		if (sortKey !== "fullName") params.set("sortBy", sortKey);
		if (sortOrder !== "asc") params.set("sortOrder", sortOrder);

		router.push(`${pathname}?${params.toString()}`);
		router.refresh();
	}, [pathname, router, pageSize, searchInput, selectedJoinPreset, selectedAgePreset, selectedLabels, customJoinFrom, customJoinTo, customAgeMin, customAgeMax, sortKey, sortOrder]);

	const toggleRoleFilter = (value: string) => {
		const newNiveles = selectedRoles.includes(value)
			? selectedRoles.filter(r => r !== value)
			: [...selectedRoles, value];
		setSelectedRoles(newNiveles);
		// Expand nivel UI keys to the backend role sentinel values before navigating
		const expandedRoleValues = newNiveles.flatMap(
			nivel => nivelFilterOptions.find(o => o.value === nivel)?.backendValues ?? [nivel]
		);
		applyFiltersWithValues(expandedRoleValues, selectedGuideIds, selectedAreaIds);
	};

	const toggleGdiFilter = (value: string) => {
		const newGdiIds = selectedGuideIds.includes(value)
			? selectedGuideIds.filter(g => g !== value)
			: [...selectedGuideIds, value];
		setSelectedGuideIds(newGdiIds);
		applyFiltersWithValues(selectedRoles, newGdiIds, selectedAreaIds);
	};

	const toggleAreaFilter = (value: string) => {
		const newAreaIds = selectedAreaIds.includes(value)
			? selectedAreaIds.filter(a => a !== value)
			: [...selectedAreaIds, value];
		setSelectedAreaIds(newAreaIds);
		applyFiltersWithValues(selectedRoles, selectedGuideIds, newAreaIds);
	};

	const toggleLabelFilter = (value: number) => {
		const newLabels = selectedLabels.includes(value)
			? selectedLabels.filter(l => l !== value)
			: [...selectedLabels, value];
		setSelectedLabels(newLabels);
		applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, selectedJoinPreset, selectedAgePreset, searchInput, newLabels);
	};

	const selectJoinPreset = (value: string) => {
		const newPreset = selectedJoinPreset === value ? "" : value;
		setSelectedJoinPreset(newPreset);
		if (newPreset !== "custom") {
			// Navigate immediately for predefined presets; for "custom" just reveal the panel
			applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, newPreset, selectedAgePreset);
		}
	};

	const selectAgePreset = (value: string) => {
		const newPreset = selectedAgePreset === value ? "" : value;
		setSelectedAgePreset(newPreset);
		if (newPreset !== "custom") {
			applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, selectedJoinPreset, newPreset);
		}
	};

	const applyCustomJoin = () => {
		if (!customJoinFrom || !customJoinTo) return;
		applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, "custom", selectedAgePreset);
	};

	const applyCustomAge = () => {
		if (!customAgeMin && !customAgeMax) return;
		applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, selectedJoinPreset, "custom");
	};

	// Remove single filter chip
	const removeFilterChip = (type: 'role' | 'gdi' | 'area' | 'label' | 'join' | 'age', value: string) => {
		switch (type) {
			case 'role':  toggleRoleFilter(value); break;
			case 'gdi':   toggleGdiFilter(value); break;
			case 'area':  toggleAreaFilter(value); break;
			case 'label': toggleLabelFilter(Number(value)); break;
			case 'join':  selectJoinPreset(""); break;
			case 'age':   selectAgePreset(""); break;
		}
	};

	// Get label for filter value
	const getFilterLabel = (type: 'role' | 'gdi' | 'area', value: string): string => {
		switch (type) {
			case 'role':
				return nivelFilterOptions.find(o => o.value === value)?.label ?? value;
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
		applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds);
	};

	const handleClearAllFilters = () => {
		setSearchInput("");
		setSelectedRoles([]);
		setSelectedGuideIds([]);
		setSelectedAreaIds([]);
		setSelectedLabels([]);
		setSelectedJoinPreset("");
		setSelectedAgePreset("");
		setCustomJoinFrom("");
		setCustomJoinTo("");
		setCustomAgeMin("");
		setCustomAgeMax("");

		const params = new URLSearchParams();
		params.set("page", "1");
		params.set("pageSize", pageSize.toString());
		params.set("memberStatus", "vigente");
		router.push(`${pathname}?${params.toString()}`);
		router.refresh();
	};

	const handleSort = (key: SortKey) => {
		const newOrder: SortOrder = sortKey === key && sortOrder === "asc" ? "desc" : "asc";
		setSortKey(key);
		setSortOrder(newOrder);

		const params = new URLSearchParams(searchParamsHook.toString());
		params.set("sortBy", key);
		params.set("sortOrder", newOrder);
		params.set("page", "1");
		router.push(`${pathname}?${params.toString()}`);
		router.refresh();
	};

	// Members come pre-sorted from the server — no client-side sort needed
	const processedMembers = members;

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
		if (updatedMember.status === "eliminado") {
			// Member was soft-deleted via the dialog — remove from vigentes list
			setMembers(prev => prev.filter(m => m.id !== updatedMember.id));
		} else {
			setMembers((prevMembers) =>
				prevMembers.map((m) => (m.id === updatedMember.id ? updatedMember : m)),
			);
		}
		router.refresh();
	};

	// Handler to open edit dialog (uses details dialog which has edit mode)
	const handleOpenEditDialog = (member: Member) => {
		setSelectedMember(member);
		setIsDetailsDialogOpen(true);
	};

	// Soft delete: el MemberDetailsDialog maneja su propio flujo via softDeleteMemberAction.
	// handleSoftDelete eliminado — era código muerto (nunca llamado desde la UI).
	// El AlertDialog de confirmación en members-list-view solo se usa para el flujo
	// alternativo de soft delete desde la tabla (actualmente sin trigger en la UI).

	const confirmSoftDelete = () => {
		if (!softDeletePendingMember) return;
		const member = softDeletePendingMember;
		setSoftDeletePendingMember(null);
		startMemberTransition(async () => {
			const result = await softDeleteMemberAction(member.id);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
				setMembers(prev => prev.filter(m => m.id !== member.id));
				router.refresh();
			} else {
				toast({ title: "Error", description: result.message, variant: "destructive" });
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
		selectedRoles.length > 0 ||
		selectedGuideIds.length > 0 ||
		selectedAreaIds.length > 0 ||
		selectedLabels.length > 0 ||
		(selectedJoinPreset !== "" && selectedJoinPreset !== "custom") ||
		(selectedJoinPreset === "custom" && !!customJoinFrom && !!customJoinTo) ||
		(selectedAgePreset !== "" && selectedAgePreset !== "custom") ||
		(selectedAgePreset === "custom" && (!!customAgeMin || !!customAgeMax));

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
								<p className="text-xs text-muted-foreground">Activos</p>
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
								ref={searchInputRef}
								type="text"
								placeholder="Buscar por nombre, email..."
								className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-primary focus:border-primary"
								value={searchInput}
								onChange={(e) => {
									const value = e.target.value;
									setSearchInput(value);
									if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
									searchDebounceRef.current = setTimeout(() => {
										isSearchPendingRef.current = true;
										applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, selectedJoinPreset, selectedAgePreset, value);
									}, 400);
								}}
								onBlur={() => {
									if (isSearchPendingRef.current) searchInputRef.current?.focus();
								}}
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
								<ShieldCheck className="mr-2 h-3.5 w-3.5" />
								<span>
									{selectedRoles.length > 0
										? `Nivel (${selectedRoles.length})`
										: "Nivel"}
								</span>
								<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuLabel>Filtrar por Nivel</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{nivelFilterOptions.map((opt) => (
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

					{/* Etiqueta filter — ecclesiastical role types */}
					{allRoleTypes.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="text-muted-foreground hover:text-primary data-[state=open]:text-primary"
								>
									<Tag className="mr-2 h-3.5 w-3.5" />
									<span>
										{selectedLabels.length > 0
											? `Etiqueta (${selectedLabels.length})`
											: "Etiqueta"}
									</span>
									<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuLabel>Filtrar por Etiqueta</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{allRoleTypes.map((rt) => (
									<DropdownMenuCheckboxItem
										key={rt.id}
										checked={selectedLabels.includes(Number(rt.id))}
										onCheckedChange={() => toggleLabelFilter(Number(rt.id))}
									>
										{rt.name}
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}

					{/* Ingreso filter — preset-based join date range */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									"text-muted-foreground hover:text-primary data-[state=open]:text-primary",
									selectedJoinPreset && "text-primary",
								)}
							>
								<Calendar className="mr-2 h-3.5 w-3.5" />
								<span>
									{selectedJoinPreset
										? JOIN_PRESETS.find(p => p.value === selectedJoinPreset)?.label ?? "Ingreso"
										: "Ingreso"}
								</span>
								<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-52">
							<DropdownMenuLabel>Filtrar por fecha de ingreso</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{JOIN_PRESETS.map((preset) => (
								<DropdownMenuCheckboxItem
									key={preset.value}
									checked={selectedJoinPreset === preset.value}
									onCheckedChange={() => selectJoinPreset(preset.value)}
								>
									{preset.label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Edad filter — preset-based age range */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									"text-muted-foreground hover:text-primary data-[state=open]:text-primary",
									selectedAgePreset && "text-primary",
								)}
							>
								<Smile className="mr-2 h-3.5 w-3.5" />
								<span>
									{selectedAgePreset
										? AGE_PRESETS.find(p => p.value === selectedAgePreset)?.label ?? "Edad"
										: "Edad"}
								</span>
								<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-52">
							<DropdownMenuLabel>Filtrar por rango de edad</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{AGE_PRESETS.map((preset) => (
								<DropdownMenuCheckboxItem
									key={preset.value}
									checked={selectedAgePreset === preset.value}
									onCheckedChange={() => selectAgePreset(preset.value)}
								>
									{preset.label}
								</DropdownMenuCheckboxItem>
							))}
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

				{/* Custom Join Range Panel */}
				{selectedJoinPreset === "custom" && (
					<div className="flex flex-wrap items-end gap-3 px-3 py-3 rounded-lg border bg-muted/40">
						<Calendar className="h-4 w-4 text-muted-foreground mt-5 shrink-0" />
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Desde</Label>
							<div className="flex gap-1">
								<Select
									value={customJoinFrom.split("-")[1] ?? ""}
									onValueChange={(month) => {
										const year = customJoinFrom.split("-")[0] || String(CURRENT_YEAR);
										setCustomJoinFrom(`${year}-${month}`);
									}}
								>
									<SelectTrigger className="w-[110px] h-8 text-xs">
										<SelectValue placeholder="Mes" />
									</SelectTrigger>
									<SelectContent>
										{MONTHS.map(m => (
											<SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									value={customJoinFrom.split("-")[0] ?? ""}
									onValueChange={(year) => {
										const month = customJoinFrom.split("-")[1] || "01";
										setCustomJoinFrom(`${year}-${month}`);
									}}
								>
									<SelectTrigger className="w-[80px] h-8 text-xs">
										<SelectValue placeholder="Año" />
									</SelectTrigger>
									<SelectContent>
										{JOIN_YEARS.map(y => (
											<SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Hasta</Label>
							<div className="flex gap-1">
								<Select
									value={customJoinTo.split("-")[1] ?? ""}
									onValueChange={(month) => {
										const year = customJoinTo.split("-")[0] || String(CURRENT_YEAR);
										setCustomJoinTo(`${year}-${month}`);
									}}
								>
									<SelectTrigger className="w-[110px] h-8 text-xs">
										<SelectValue placeholder="Mes" />
									</SelectTrigger>
									<SelectContent>
										{MONTHS.map(m => (
											<SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									value={customJoinTo.split("-")[0] ?? ""}
									onValueChange={(year) => {
										const month = customJoinTo.split("-")[1] || "01";
										setCustomJoinTo(`${year}-${month}`);
									}}
								>
									<SelectTrigger className="w-[80px] h-8 text-xs">
										<SelectValue placeholder="Año" />
									</SelectTrigger>
									<SelectContent>
										{JOIN_YEARS.map(y => (
											<SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<Button
							size="sm"
							className="h-8"
							onClick={applyCustomJoin}
							disabled={!customJoinFrom || customJoinFrom.split("-").length < 2 || !customJoinTo || customJoinTo.split("-").length < 2}
						>
							Aplicar
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-8 text-muted-foreground"
							onClick={() => { setSelectedJoinPreset(""); setCustomJoinFrom(""); setCustomJoinTo(""); }}
						>
							Cancelar
						</Button>
					</div>
				)}

				{/* Custom Age Range Panel */}
				{selectedAgePreset === "custom" && (
					<div className="flex flex-wrap items-end gap-3 px-3 py-3 rounded-lg border bg-muted/40">
						<Smile className="h-4 w-4 text-muted-foreground mt-5 shrink-0" />
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Edad mínima</Label>
							<Input
								type="number"
								min="0"
								max="120"
								placeholder="Ej: 18"
								className="w-[80px] h-8 text-xs"
								value={customAgeMin}
								onChange={(e) => setCustomAgeMin(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && applyCustomAge()}
							/>
						</div>
						<span className="text-muted-foreground text-sm mb-1">–</span>
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Edad máxima</Label>
							<Input
								type="number"
								min="0"
								max="120"
								placeholder="Ej: 29"
								className="w-[80px] h-8 text-xs"
								value={customAgeMax}
								onChange={(e) => setCustomAgeMax(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && applyCustomAge()}
							/>
						</div>
						<Button
							size="sm"
							className="h-8"
							onClick={applyCustomAge}
							disabled={!customAgeMin && !customAgeMax}
						>
							Aplicar
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-8 text-muted-foreground"
							onClick={() => { setSelectedAgePreset(""); setCustomAgeMin(""); setCustomAgeMax(""); }}
						>
							Cancelar
						</Button>
					</div>
				)}

				{/* Active Filters Chips */}
				{hasActiveFilters && (
					<div className="flex flex-wrap gap-2 pb-4">
						{selectedRoles.map(role => (
							<Badge
								key={`role-${role}`}
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('role', role)}
							>
								Nivel: {getFilterLabel('role', role)}
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
						{selectedLabels.map(labelId => (
							<Badge
								key={`label-${labelId}`}
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('label', String(labelId))}
							>
								Etiqueta: {allRoleTypes.find(rt => Number(rt.id) === labelId)?.name ?? String(labelId)}
								<X className="h-3 w-3" />
							</Badge>
						))}
						{selectedJoinPreset && selectedJoinPreset !== "custom" && (
							<Badge
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('join', selectedJoinPreset)}
							>
								Ingreso: {JOIN_PRESETS.find(p => p.value === selectedJoinPreset)?.label}
								<X className="h-3 w-3" />
							</Badge>
						)}
						{selectedJoinPreset === "custom" && customJoinFrom && customJoinTo && (
							<Badge
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => { setSelectedJoinPreset(""); setCustomJoinFrom(""); setCustomJoinTo(""); applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, "", selectedAgePreset); }}
							>
								Ingreso: {formatMonthYear(customJoinFrom)} – {formatMonthYear(customJoinTo)}
								<X className="h-3 w-3" />
							</Badge>
						)}
						{selectedAgePreset && selectedAgePreset !== "custom" && (
							<Badge
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => removeFilterChip('age', selectedAgePreset)}
							>
								Edad: {AGE_PRESETS.find(p => p.value === selectedAgePreset)?.label}
								<X className="h-3 w-3" />
							</Badge>
						)}
						{selectedAgePreset === "custom" && (customAgeMin || customAgeMax) && (
							<Badge
								variant="secondary"
								className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
								onClick={() => { setSelectedAgePreset(""); setCustomAgeMin(""); setCustomAgeMax(""); applyFiltersWithValues(selectedRoles, selectedGuideIds, selectedAreaIds, selectedJoinPreset, ""); }}
							>
								Edad: {customAgeMin || "0"}–{customAgeMax || "∞"} años
								<X className="h-3 w-3" />
							</Badge>
						)}
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
							<TableHead>Nivel</TableHead>
							<TableHead
								onClick={() => handleSort("lastAttendance" as SortKey)}
								className="cursor-pointer"
							>
								<div className="flex items-center gap-1 hover:text-primary">
									Última Asistencia
								</div>
							</TableHead>
							<TableHead className="w-[48px]"><span className="sr-only">Ver detalles</span></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{processedMembers.map((member) => {
							const memberAreas = getMemberAreaNames(member);
							const attendanceStatus = getAttendanceStatus(member.id);
							return (
								<TableRow
									key={member.id}
									className="hover:bg-muted/30 transition-colors"
								>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarFallback className={cn("text-xs font-medium", operativeLevelConfig[calculateOperativeLevel(member)].avatarClass)}>
													{member.firstName.substring(0, 1)}
													{member.lastName.substring(0, 1)}
												</AvatarFallback>
											</Avatar>
											<span className="font-medium">
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
												<TooltipProvider delayDuration={200}>
													<Tooltip>
														<TooltipTrigger asChild>
															<Badge variant="secondary" className="text-xs cursor-default">
																+{memberAreas.length - 2}
															</Badge>
														</TooltipTrigger>
														<TooltipContent side="top">
															<ul className="space-y-0.5">
																{memberAreas.slice(2).map((area) => (
																	<li key={area} className="text-xs">{area}</li>
																))}
															</ul>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											)}
										</div>
									</TableCell>
									<TableCell>
										{(() => {
											const level = calculateOperativeLevel(member);
											const cfg = operativeLevelConfig[level];
											return (
												<div className="space-y-1">
													<div className="flex items-center gap-1.5">
														<span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dotClass)} />
														<Badge
															variant="outline"
															className={cn("text-xs border", cfg.badgeClass)}
														>
															{getOperativeLevelLabel(member)}
														</Badge>
													</div>
													{member.ecclesiasticalRoles && member.ecclesiasticalRoles.length > 0 && (
														<div className="flex items-center gap-1 pl-3.5">
															<Badge variant="outline" className="text-xs border-border text-muted-foreground">
																{member.ecclesiasticalRoles[0].name}
															</Badge>
															{member.ecclesiasticalRoles.length > 1 && (
																<TooltipProvider delayDuration={200}>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Badge variant="secondary" className="text-xs cursor-default">
																				+{member.ecclesiasticalRoles.length - 1}
																			</Badge>
																		</TooltipTrigger>
																		<TooltipContent side="top">
																			<ul className="space-y-0.5">
																				{member.ecclesiasticalRoles.slice(1).map(r => (
																					<li key={r.roleTypeId} className="text-xs">{r.name}</li>
																				))}
																			</ul>
																		</TooltipContent>
																	</Tooltip>
																</TooltipProvider>
															)}
														</div>
													)}
												</div>
											);
										})()}
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
									<TableCell className="text-center">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											disabled={isProcessingMember}
											onClick={() => handleOpenDetailsDialog(member)}
											title="Ver detalles del miembro"
										>
											<Info className="h-4 w-4 text-muted-foreground" />
										</Button>
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
					allRoleTypes={allRoleTypes}
					isOpen={isDetailsDialogOpen}
					onClose={handleCloseDetailsDialog}
					onMemberUpdated={handleMemberUpdated}
					updateMemberAction={updateMemberAction}
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
							mode="create"
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
			{/* AlertDialog: Dar de baja (soft delete) */}
			<AlertDialog
				open={softDeletePendingMember !== null}
				onOpenChange={(open) => { if (!open) setSoftDeletePendingMember(null); }}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Dar de baja a este miembro?</AlertDialogTitle>
						<AlertDialogDescription>
							<strong>{softDeletePendingMember?.firstName} {softDeletePendingMember?.lastName}</strong> quedará
							archivado en la sección &quot;Dados de baja&quot; y podrá ser restaurado en cualquier momento.
							Su historial de asistencia y diezmos se conservará.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmSoftDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Dar de baja
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
