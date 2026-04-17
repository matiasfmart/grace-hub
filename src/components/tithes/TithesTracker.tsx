"use client";

import {
	eachMonthOfInterval,
	endOfMonth,
	format,
	isValid,
	parseISO,
	startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import {
	Activity,
	Briefcase,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Filter,
	Loader2,
	MoreVertical,
	Pencil,
	Search,
	ShieldCheck,
	Users,
	X,
	XCircle,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import type { Member, TitheRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { batchUpdateTithesForMonth } from "@/lib/api/services";
import { Label } from "../ui/label";
import TitheProgressionChart from "./TitheProgressionChart";
import TitheSummaryCards from "./TitheSummaryCards";

interface FilterOption {
	value: string;
	label: string;
}

interface TithesTrackerProps {
	initialMembers: Member[];
	initialTitheRecords: TitheRecord[];
	totalMembers: number;
	totalPages: number;
	currentPage: number;
	pageSize: number;
	absoluteTotalMembers: number;
	filters: {
		roleFilterOptions: FilterOption[];
		statusFilterOptions: FilterOption[];
		gdiFilterOptions: FilterOption[];
		areaFilterOptions: FilterOption[];
		currentSearchTerm: string;
		currentRoleFilters: string[];
		currentStatusFilters: string[];
		currentGdiFilters: string[];
		currentAreaFilters: string[];
	};
	initialStartDate?: string;
	initialEndDate?: string;
}

export function TithesTracker({
	initialMembers,
	initialTitheRecords,
	totalMembers,
	totalPages,
	currentPage,
	pageSize,
	absoluteTotalMembers,
	filters,
	initialStartDate,
	initialEndDate,
}: TithesTrackerProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const [isUpdating, startUpdateTransition] = useTransition();

	const [searchInput, setSearchInput] = useState(filters.currentSearchTerm);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
		filters.currentStatusFilters,
	);
	const [selectedRoles, setSelectedRoles] = useState<string[]>(
		filters.currentRoleFilters,
	);
	const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>(
		filters.currentGdiFilters,
	);
	const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(
		filters.currentAreaFilters,
	);

	const [startDate, setStartDate] = useState<Date | undefined>(
		initialStartDate && isValid(parseISO(initialStartDate))
			? parseISO(initialStartDate)
			: startOfMonth(new Date()),
	);
	const [endDate, setEndDate] = useState<Date | undefined>(
		initialEndDate && isValid(parseISO(initialEndDate))
			? parseISO(initialEndDate)
			: endOfMonth(new Date()),
	);

	const [titheRecords, setTitheRecords] = useState(initialTitheRecords);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingMonth, setEditingMonth] = useState<{
		year: number;
		month: number;
		monthLabel: string;
	} | null>(null);
	const [draftTitheStatus, setDraftTitheStatus] = useState<
		Record<string, boolean>
	>({});

	const months = useMemo(() => {
		if (!startDate || !endDate || startDate > endDate) return [];
		return eachMonthOfInterval({ start: startDate, end: endDate });
	}, [startDate, endDate]);

	const handleApplyFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", "1");
		if (searchInput) params.set("search", searchInput);
		else params.delete("search");
		if (selectedStatuses.length > 0)
			params.set("status", selectedStatuses.join(","));
		else params.delete("status");
		if (selectedRoles.length > 0) params.set("role", selectedRoles.join(","));
		else params.delete("role");
		if (selectedGuideIds.length > 0)
			params.set("guide", selectedGuideIds.join(","));
		else params.delete("guide");
		if (selectedAreaIds.length > 0)
			params.set("area", selectedAreaIds.join(","));
		else params.delete("area");
		if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
		else params.delete("startDate");
		if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
		else params.delete("endDate");
		router.push(`${pathname}?${params.toString()}`);
	};

	const clearMemberFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		["search", "status", "role", "guide", "area"].forEach((p) =>
			params.delete(p),
		);
		setSearchInput("");
		setSelectedStatuses([]);
		setSelectedRoles([]);
		setSelectedGuideIds([]);
		setSelectedAreaIds([]);
		router.push(`${pathname}?${params.toString()}`);
	};

	const createPageURL = (page: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", page.toString());
		return `${pathname}?${params.toString()}`;
	};

	const handlePageSizeChange = (newSize: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("pageSize", newSize);
		params.set("page", "1");
		router.push(`${pathname}?${params.toString()}`);
	};

	const handleMonthClick = (monthDate: Date) => {
		const year = monthDate.getFullYear();
		const monthNum = monthDate.getMonth() + 1;
		const monthLabel = format(monthDate, "MMMM yyyy", { locale: es });

		const initialDraftStatus: Record<string, boolean> = {};
		initialMembers.forEach((member) => {
			initialDraftStatus[member.id] = titheRecords.some(
				(r) =>
					r.memberId === member.id && r.year === year && r.month === monthNum,
			);
		});

		setDraftTitheStatus(initialDraftStatus);
		setEditingMonth({ year, month: monthNum, monthLabel });
		setIsEditDialogOpen(true);
	};

	const handleDraftTitheChange = (memberId: string, didTithe: boolean) => {
		setDraftTitheStatus((prev) => ({
			...prev,
			[memberId]: didTithe,
		}));
	};

	const handleSaveChanges = () => {
		if (!editingMonth) return;

		const updates = Object.entries(draftTitheStatus).map(
			([memberId, didTithe]) => ({
				memberId,
				didTithe,
			}),
		);

		startUpdateTransition(async () => {
			const result = await batchUpdateTithesForMonth(
				editingMonth.year,
				editingMonth.month,
				updates,
			);

			if (result.success) {
				const updatedRecords = titheRecords.filter(
					(r) =>
						!(r.year === editingMonth.year && r.month === editingMonth.month),
				);
				const newRecordsForMonth = updates
					.filter((update) => update.didTithe)
					.map((update) => ({
						id: `${update.memberId}-${editingMonth.year}-${editingMonth.month}`,
						memberId: update.memberId,
						year: editingMonth.year,
						month: editingMonth.month,
					}));
				setTitheRecords([...updatedRecords, ...newRecordsForMonth]);

				toast({ title: "Éxito", description: result.message });
				setIsEditDialogOpen(false);
				setEditingMonth(null);
			} else {
				toast({
					title: "Error",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	};

	const hasActiveMemberFilters =
		filters.currentSearchTerm ||
		filters.currentStatusFilters.length > 0 ||
		filters.currentRoleFilters.length > 0 ||
		filters.currentGdiFilters.length > 0 ||
		filters.currentAreaFilters.length > 0;

	const activeFilterCount =
		selectedStatuses.length +
		selectedRoles.length +
		selectedGuideIds.length +
		selectedAreaIds.length;

	const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false);

	const removeFilterChip = (
		type: "status" | "role" | "gdi" | "area",
		value: string,
	) => {
		let newStatuses = selectedStatuses;
		let newRoles = selectedRoles;
		let newGuides = selectedGuideIds;
		let newAreas = selectedAreaIds;

		switch (type) {
			case "status":
				newStatuses = selectedStatuses.filter((s) => s !== value);
				setSelectedStatuses(newStatuses);
				break;
			case "role":
				newRoles = selectedRoles.filter((s) => s !== value);
				setSelectedRoles(newRoles);
				break;
			case "gdi":
				newGuides = selectedGuideIds.filter((s) => s !== value);
				setSelectedGuideIds(newGuides);
				break;
			case "area":
				newAreas = selectedAreaIds.filter((s) => s !== value);
				setSelectedAreaIds(newAreas);
				break;
		}

		// Auto-apply when removing chip
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", "1");
		if (searchInput) params.set("search", searchInput);
		else params.delete("search");
		if (newStatuses.length > 0) params.set("status", newStatuses.join(","));
		else params.delete("status");
		if (newRoles.length > 0) params.set("role", newRoles.join(","));
		else params.delete("role");
		if (newGuides.length > 0) params.set("guide", newGuides.join(","));
		else params.delete("guide");
		if (newAreas.length > 0) params.set("area", newAreas.join(","));
		else params.delete("area");
		if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
		if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
		router.push(`${pathname}?${params.toString()}`);
	};

	const getFilterLabel = (
		type: "status" | "role" | "gdi" | "area",
		value: string,
	) => {
		switch (type) {
			case "status":
				return (
					filters.statusFilterOptions.find((o) => o.value === value)?.label ||
					value
				);
			case "role":
				return (
					filters.roleFilterOptions.find((o) => o.value === value)?.label ||
					value
				);
			case "gdi":
				return (
					filters.gdiFilterOptions.find((o) => o.value === value)?.label ||
					value
				);
			case "area":
				return (
					filters.areaFilterOptions.find((o) => o.value === value)?.label ||
					value
				);
		}
	};

	return (
		<>
			<div className="space-y-6">
				{/* Compact Toolbar */}
				<div className="space-y-3">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
						{/* Search */}
						<div className="relative flex-1 min-w-0 max-w-xs">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar miembro..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
								className="pl-9 h-9"
							/>
						</div>

						{/* Date Range */}
						<div className="flex items-center gap-2">
							<DatePicker
								date={startDate}
								setDate={setStartDate}
								placeholder="Desde"
							/>
							<span className="text-muted-foreground text-sm">-</span>
							<DatePicker
								date={endDate}
								setDate={setEndDate}
								placeholder="Hasta"
							/>
						</div>

						{/* Filters Popover */}
						<Popover open={filtersPopoverOpen} onOpenChange={setFiltersPopoverOpen}>
							<PopoverTrigger asChild>
								<Button
									variant={activeFilterCount > 0 ? "secondary" : "outline"}
									size="sm"
									className="h-9"
								>
									<Filter className="h-4 w-4 mr-2" />
									Filtros
									{activeFilterCount > 0 && (
										<span className="ml-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px]">
											{activeFilterCount}
										</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-80 p-4" align="end">
								<div className="space-y-4">
									<h4 className="font-medium text-sm">Filtros de Miembros</h4>

									{/* Status Filter */}
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground flex items-center">
											<Activity className="h-3.5 w-3.5 mr-1.5" />
											Estado
										</label>
										<div className="flex flex-wrap gap-1">
											{filters.statusFilterOptions.map((opt) => (
												<span
													key={opt.value}
													onClick={() =>
														setSelectedStatuses((prev) =>
															prev.includes(opt.value)
																? prev.filter((s) => s !== opt.value)
																: [...prev, opt.value],
														)
													}
													className={cn(
														"cursor-pointer text-xs px-2 py-1 rounded-md border transition-colors",
														selectedStatuses.includes(opt.value)
															? "bg-primary text-primary-foreground border-primary"
															: "bg-background hover:bg-muted border-input"
													)}
												>
													{opt.label}
												</span>
											))}
										</div>
									</div>

									{/* Role Filter */}
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground flex items-center">
											<ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
											Rol
										</label>
										<div className="flex flex-wrap gap-1">
											{filters.roleFilterOptions.map((opt) => (
												<span
													key={opt.value}
													onClick={() =>
														setSelectedRoles((prev) =>
															prev.includes(opt.value)
																? prev.filter((s) => s !== opt.value)
																: [...prev, opt.value],
														)
													}
													className={cn(
														"cursor-pointer text-xs px-2 py-1 rounded-md border transition-colors",
														selectedRoles.includes(opt.value)
															? "bg-primary text-primary-foreground border-primary"
															: "bg-background hover:bg-muted border-input"
													)}
												>
													{opt.label}
												</span>
											))}
										</div>
									</div>

									{/* GDI Filter */}
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground flex items-center">
											<Users className="h-3.5 w-3.5 mr-1.5" />
											GDI ({selectedGuideIds.length})
										</label>
										<Command className="border rounded-md">
											<CommandInput
												placeholder="Buscar GDI..."
												className="h-8 text-xs"
											/>
											<CommandList className="max-h-24">
												{filters.gdiFilterOptions.map((opt) => (
													<CommandItem
														key={opt.value}
														onSelect={() =>
															setSelectedGuideIds((prev) =>
																prev.includes(opt.value)
																	? prev.filter((s) => s !== opt.value)
																	: [...prev, opt.value],
															)
														}
														className="text-xs cursor-pointer"
													>
														<Check
															className={cn(
																"mr-2 h-3 w-3",
																selectedGuideIds.includes(opt.value)
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
														<span className="truncate">{opt.label}</span>
													</CommandItem>
												))}
											</CommandList>
										</Command>
									</div>

									{/* Area Filter */}
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground flex items-center">
											<Briefcase className="h-3.5 w-3.5 mr-1.5" />
											Área ({selectedAreaIds.length})
										</label>
										<Command className="border rounded-md">
											<CommandInput
												placeholder="Buscar Área..."
												className="h-8 text-xs"
											/>
											<CommandList className="max-h-24">
												{filters.areaFilterOptions.map((opt) => (
													<CommandItem
														key={opt.value}
														onSelect={() =>
															setSelectedAreaIds((prev) =>
																prev.includes(opt.value)
																	? prev.filter((s) => s !== opt.value)
																	: [...prev, opt.value],
															)
														}
														className="text-xs cursor-pointer"
													>
														<Check
															className={cn(
																"mr-2 h-3 w-3",
																selectedAreaIds.includes(opt.value)
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
														<span className="truncate">{opt.label}</span>
													</CommandItem>
												))}
											</CommandList>
										</Command>
									</div>

									{/* Apply Button */}
									<div className="flex justify-end gap-2 pt-2 border-t">
										{activeFilterCount > 0 && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setSelectedStatuses([]);
													setSelectedRoles([]);
													setSelectedGuideIds([]);
													setSelectedAreaIds([]);
												}}
											>
												Limpiar
											</Button>
										)}
										<Button size="sm" onClick={() => {
											handleApplyFilters();
											setFiltersPopoverOpen(false);
										}}>
											Aplicar
										</Button>
									</div>
								</div>
							</PopoverContent>
						</Popover>

						{/* Apply Button */}
						<Button size="sm" className="h-9" onClick={handleApplyFilters}>
							<Search className="h-4 w-4 mr-2" />
							Buscar
						</Button>

						{/* Clear All */}
						{hasActiveMemberFilters && (
							<Button
								variant="ghost"
								size="sm"
								className="h-9 text-destructive hover:text-destructive/80"
								onClick={clearMemberFilters}
							>
								<X className="h-4 w-4 mr-1" />
								Limpiar
							</Button>
						)}
					</div>

					{/* Active Filter Chips */}
					{activeFilterCount > 0 && (
						<div className="flex flex-wrap gap-1.5">
							{selectedStatuses.map((status) => (
								<span
									key={`status-${status}`}
									className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-md"
								>
									<Activity className="h-3 w-3" />
									{getFilterLabel("status", status)}
									<button
										type="button"
										onClick={() => removeFilterChip("status", status)}
										className="ml-1 hover:bg-muted rounded-full p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
							{selectedRoles.map((role) => (
								<span
									key={`role-${role}`}
									className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-md"
								>
									<ShieldCheck className="h-3 w-3" />
									{getFilterLabel("role", role)}
									<button
										type="button"
										onClick={() => removeFilterChip("role", role)}
										className="ml-1 hover:bg-muted rounded-full p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
							{selectedGuideIds.map((gdi) => (
								<span
									key={`gdi-${gdi}`}
									className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-md"
								>
									<Users className="h-3 w-3" />
									{getFilterLabel("gdi", gdi)}
									<button
										type="button"
										onClick={() => removeFilterChip("gdi", gdi)}
										className="ml-1 hover:bg-muted rounded-full p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
							{selectedAreaIds.map((area) => (
								<span
									key={`area-${area}`}
									className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-md"
								>
									<Briefcase className="h-3 w-3" />
									{getFilterLabel("area", area)}
									<button
										type="button"
										onClick={() => removeFilterChip("area", area)}
										className="ml-1 hover:bg-muted rounded-full p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
						</div>
					)}
				</div>

				<TitheSummaryCards
					filteredMembers={initialMembers}
					allTitheRecords={titheRecords}
					months={months}
				/>

				<TitheProgressionChart
					filteredMembers={initialMembers}
					allTitheRecords={titheRecords}
					months={months}
				/>

				<div className="border rounded-lg shadow-md">
					<ScrollArea className="w-full whitespace-nowrap">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="sticky left-0 bg-card z-10 w-[250px] min-w-[250px]">
										Miembro
									</TableHead>
									{months.map((month) => {
										const year = month.getFullYear();
										const monthNum = month.getMonth() + 1;
										const monthTithers = titheRecords.filter(
											(r) => r.year === year && r.month === monthNum,
										).length;
										const percentage = initialMembers.length > 0
											? Math.round((monthTithers / initialMembers.length) * 100)
											: 0;
										return (
										<TableHead
											key={month.toISOString()}
											className="text-center min-w-[120px]"
										>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<button
														className="w-full h-full p-2 font-semibold hover:bg-muted rounded-md flex flex-col items-center justify-center gap-0.5"
													>
														<span className="capitalize text-primary">
															{format(month, "MMM yyyy", { locale: es })}
														</span>
														<span className={cn(
															"text-[10px] font-normal",
															percentage >= 70 ? "text-green-600" :
															percentage >= 50 ? "text-yellow-600" : "text-red-600"
														)}>
															{percentage}% ({monthTithers})
														</span>
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="center">
													<DropdownMenuLabel className="capitalize">
														{format(month, "MMMM yyyy", { locale: es })}
													</DropdownMenuLabel>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => handleMonthClick(month)}
														className="cursor-pointer"
													>
														<Pencil className="h-4 w-4 mr-2" />
														Editar Diezmos
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableHead>
									);
									})}
								</TableRow>
							</TableHeader>
							<TableBody>
								{initialMembers.length > 0 ? (
									initialMembers.map((member) => (
										<TableRow key={member.id}>
											<TableCell className="sticky left-0 bg-card z-10 font-medium">
												{member.firstName} {member.lastName}
											</TableCell>
											{months.map((month) => {
												const year = month.getFullYear();
												const monthNum = month.getMonth() + 1;
												const isChecked = titheRecords.some(
													(r) =>
														r.memberId === member.id &&
														r.year === year &&
														r.month === monthNum,
												);
												return (
													<TableCell
														key={month.toISOString()}
														className="text-center"
													>
														{isChecked ? (
															<CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
														) : (
															<XCircle className="h-5 w-5 text-muted-foreground/50 mx-auto" />
														)}
													</TableCell>
												);
											})}
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={months.length + 1}
											className="h-24 text-center"
										>
											No se encontraron miembros con los filtros aplicados.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
					{totalPages > 0 && (
						<div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 p-4">
							<div className="text-sm text-muted-foreground">
								{" "}
								{totalMembers} de {absoluteTotalMembers} miembro(s). Página{" "}
								{currentPage} de {totalPages}.
							</div>
							<div className="flex items-center space-x-2">
								<Select
									value={pageSize.toString()}
									onValueChange={handlePageSizeChange}
								>
									<SelectTrigger className="w-[70px] h-8 text-xs">
										<SelectValue placeholder={pageSize.toString()} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="10">10</SelectItem>
										<SelectItem value="25">25</SelectItem>
										<SelectItem value="50">50</SelectItem>
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() => router.push(createPageURL(currentPage - 1))}
									disabled={currentPage <= 1}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() => router.push(createPageURL(currentPage + 1))}
									disabled={currentPage >= totalPages}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							Registrar Diezmos para {editingMonth?.monthLabel}
						</DialogTitle>
						<DialogDescription>
							Marque los miembros que han diezmado este mes.
						</DialogDescription>
					</DialogHeader>
					<ScrollArea className="max-h-[60vh] my-4 pr-3">
						<div className="space-y-2">
							{initialMembers.map((member) => (
								<div
									key={member.id}
									className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted"
								>
									<Checkbox
										id={`edit-${member.id}`}
										checked={draftTitheStatus[member.id] || false}
										onCheckedChange={(checked) =>
											handleDraftTitheChange(member.id, !!checked)
										}
									/>
									<Label
										htmlFor={`edit-${member.id}`}
										className="font-normal flex-grow cursor-pointer"
									>
										{member.firstName} {member.lastName}
									</Label>
								</div>
							))}
						</div>
					</ScrollArea>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button onClick={handleSaveChanges} disabled={isUpdating}>
							{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Guardar Cambios
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
