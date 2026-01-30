"use client";

import {
	ArrowDownNarrowWide,
	ArrowUpNarrowWide,
	Briefcase,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Filter,
	Info,
	ListPlus,
	Search,
	ShieldCheck,
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
	| "fullName";
type SortOrder = "asc" | "desc";

const roleDisplayMap: Record<MemberRoleType, string> = {
	Leader: "Líder",
	Worker: "Obrero",
	GeneralAttendee: "Asistente General",
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
	Active: "Activo",
	Inactive: "Inactivo",
	New: "Nuevo",
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

	useEffect(() => {
		setMembers(initialMembers);
	}, [initialMembers]);

	const gdiGuidesForFilter = useMemo(() => {
		const guideIds = new Set(allGDIs.map((gdi) => gdi.guideId).filter(Boolean));
		const guides = allMembersForDropdowns
			.filter((member) => guideIds.has(member.id))
			.sort((a, b) =>
				`${a.firstName} ${a.lastName}`.localeCompare(
					`${b.firstName} ${b.lastName}`,
				),
			);
		return [
			{ id: NO_GDI_FILTER_VALUE, firstName: "No Asignado a GDI", lastName: "" },
			...guides,
		];
	}, [allGDIs, allMembersForDropdowns]);

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

	const handleFilterOrSearch = () => {
		const params = new URLSearchParams();
		params.set("page", "1");

		params.set("pageSize", pageSize.toString());

		if (searchInput.trim()) params.set("search", searchInput.trim());

		if (selectedStatuses.length > 0)
			params.set("memberStatus", selectedStatuses.join(","));
		else params.delete("memberStatus");

		if (selectedRoles.length > 0) params.set("role", selectedRoles.join(","));
		else params.delete("role");

		if (selectedGuideIds.length > 0)
			params.set("guide", selectedGuideIds.join(","));
		else params.delete("guide");

		if (selectedAreaIds.length > 0)
			params.set("area", selectedAreaIds.join(","));
		else params.delete("area");

		router.push(`${pathname}?${params.toString()}`);
		router.refresh();
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
					<div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
						<Button
							onClick={() => setIsAddMemberDialogOpen(true)}
							disabled={isProcessingMember}
							className="w-full sm:w-auto"
						>
							<UserPlus className="mr-2 h-4 w-4" /> Agregar Nuevo Miembro
						</Button>
						<Button
							asChild
							variant="outline"
							disabled={isProcessingMember}
							className="w-full sm:w-auto"
						>
							<Link href="/members/bulk-add">
								<ListPlus className="mr-2 h-4 w-4" /> Agregar Múltiples Miembros
							</Link>
						</Button>
					</div>
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
									onCheckedChange={() =>
										toggleFilterItem(
											opt.value,
											selectedStatuses,
											setSelectedStatuses,
										)
									}
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
									onCheckedChange={() =>
										toggleFilterItem(opt.value, selectedRoles, setSelectedRoles)
									}
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
										Filtrar por GDI (Guía o Miembro)
									</DropdownMenuLabel>
									<DropdownMenuSeparator className="mx-1 my-1" />
									<CommandGroup>
										{gdiGuidesForFilter.map((guide) => (
											<CommandItem
												key={
													guide.id === NO_GDI_FILTER_VALUE
														? NO_GDI_FILTER_VALUE
														: guide.id
												}
												value={`${guide.firstName} ${guide.id !== NO_GDI_FILTER_VALUE ? guide.lastName : ""}`}
												onSelect={() =>
													toggleFilterItem(
														guide.id,
														selectedGuideIds,
														setSelectedGuideIds,
													)
												}
												className="text-xs cursor-pointer"
											>
												<div className="flex items-center w-full">
													<Check
														className={cn(
															"mr-2 h-3.5 w-3.5",
															selectedGuideIds.includes(guide.id)
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													<span className="truncate">
														{guide.firstName}{" "}
														{guide.id !== NO_GDI_FILTER_VALUE
															? guide.lastName
															: ""}
														{guide.id !== NO_GDI_FILTER_VALUE ? ` (Guía)` : ""}
													</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
									{gdiGuidesForFilter.length === 1 &&
										gdiGuidesForFilter[0].id === NO_GDI_FILTER_VALUE && (
											<CommandItem
												disabled
												className="text-xs text-muted-foreground text-center py-2"
											>
												No hay guías para mostrar
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
												onSelect={() =>
													toggleFilterItem(
														area.id,
														selectedAreaIds,
														setSelectedAreaIds,
													)
												}
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

					<div className="flex items-center gap-2 ml-auto">
						<Button onClick={handleFilterOrSearch} size="sm" variant="outline">
							<Filter className="mr-2 h-3.5 w-3.5" /> Aplicar
						</Button>
						{hasActiveFilters && (
							<Button
								onClick={handleClearAllFilters}
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-destructive"
							>
								<X className="mr-1 h-3.5 w-3.5" /> Limpiar
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className="overflow-x-auto bg-card rounded-lg shadow-md">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[80px]">Avatar</TableHead>
							<TableHead
								onClick={() => handleSort("fullName")}
								className="cursor-pointer"
							>
								<div className="flex items-center gap-1 hover:text-primary">
									Nombre Completo <SortIcon columnKey="fullName" />
								</div>
							</TableHead>
							<TableHead>Teléfono</TableHead>
							<TableHead>GDI</TableHead>
							<TableHead>Áreas</TableHead>
							<TableHead>Roles</TableHead>
							<TableHead
								onClick={() => handleSort("status")}
								className="cursor-pointer"
							>
								<div className="flex items-center gap-1 hover:text-primary">
									Estado <SortIcon columnKey="status" />
								</div>
							</TableHead>
							<TableHead className="text-center">Info</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{processedMembers.map((member) => {
							const memberAreas = getMemberAreaNames(member);
							return (
								<TableRow
									key={member.id}
									className="hover:bg-muted/50 transition-colors"
								>
									<TableCell>
										<Avatar>
											<AvatarFallback>
												{member.firstName.substring(0, 1)}
												{member.lastName.substring(0, 1)}
											</AvatarFallback>
										</Avatar>
									</TableCell>
									<TableCell className="font-medium">
										{member.firstName} {member.lastName}
									</TableCell>
									<TableCell>{member.phone}</TableCell>
									<TableCell>{getGdiName(member)}</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1 max-w-xs">
											{memberAreas.length > 0 ? (
												memberAreas.map((areaName) => (
													<Badge
														key={areaName}
														variant="outline"
														className="text-xs whitespace-nowrap"
													>
														{areaName}
													</Badge>
												))
											) : (
												<span className="text-xs text-muted-foreground">
													N/A
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{member.roles && member.roles.length > 0 ? (
												member.roles.map((role) => (
													<Badge
														key={role}
														variant="secondary"
														className="text-xs"
													>
														{roleDisplayMap[role] || role}
													</Badge>
												))
											) : (
												<span className="text-xs text-muted-foreground">
													N/A
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant={
												member.status === "Active"
													? "default"
													: member.status === "Inactive"
														? "secondary"
														: "outline"
											}
											className={
												member.status === "Active"
													? "bg-green-500/20 text-green-700 border-green-500/50"
													: member.status === "Inactive"
														? "bg-red-500/20 text-red-700 border-red-500/50"
														: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50"
											}
										>
											{displayStatus(member.status)}
										</Badge>
									</TableCell>
									<TableCell className="text-center">
										<Button
											variant="outline"
											size="icon"
											onClick={() => handleOpenDetailsDialog(member)}
											title="Ver Detalles"
											disabled={isProcessingMember}
										>
											<Info className="h-4 w-4" />
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
					allAttendanceRecords={allAttendanceRecords}
					allTitheRecords={allTitheRecords}
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
