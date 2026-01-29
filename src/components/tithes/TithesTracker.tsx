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
	ChevronLeft,
	ChevronRight,
	Filter,
	Loader2,
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
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

	return (
		<>
			<div className="space-y-6">
				<div className="space-y-4 p-4 border rounded-lg bg-card shadow-sm">
					<h3 className="text-lg font-semibold flex items-center">
						<Filter className="mr-2 h-5 w-5 text-primary" /> Filtros
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<Input
							placeholder="Buscar miembro..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
						/>
						<DatePicker
							date={startDate}
							setDate={setStartDate}
							placeholder="Mes de Inicio"
						/>
						<DatePicker
							date={endDate}
							setDate={setEndDate}
							placeholder="Mes de Fin"
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="text-xs">
									<Activity className="mr-1.5 h-3.5 w-3.5" /> Estado (
									{selectedStatuses.length})
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuLabel>Estado</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{filters.statusFilterOptions.map((opt) => (
									<DropdownMenuCheckboxItem
										key={opt.value}
										checked={selectedStatuses.includes(opt.value)}
										onCheckedChange={() =>
											setSelectedStatuses((prev) =>
												prev.includes(opt.value)
													? prev.filter((s) => s !== opt.value)
													: [...prev, opt.value],
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
								<Button variant="outline" size="sm" className="text-xs">
									<ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Rol (
									{selectedRoles.length})
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuLabel>Rol</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{filters.roleFilterOptions.map((opt) => (
									<DropdownMenuCheckboxItem
										key={opt.value}
										checked={selectedRoles.includes(opt.value)}
										onCheckedChange={() =>
											setSelectedRoles((prev) =>
												prev.includes(opt.value)
													? prev.filter((s) => s !== opt.value)
													: [...prev, opt.value],
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
								<Button variant="outline" size="sm" className="text-xs">
									<Users className="mr-1.5 h-3.5 w-3.5" /> GDI (
									{selectedGuideIds.length})
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-64 p-0">
								<Command>
									<CommandInput
										placeholder="Buscar GDI..."
										className="h-9 border-0 shadow-none focus-visible:ring-0"
									/>
									<CommandList>
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
														"mr-2 h-3.5 w-3.5",
														selectedGuideIds.includes(opt.value)
															? "opacity-100"
															: "opacity-0",
													)}
												/>{" "}
												<span className="truncate">{opt.label}</span>
											</CommandItem>
										))}
									</CommandList>
								</Command>
							</DropdownMenuContent>
						</DropdownMenu>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="text-xs">
									<Briefcase className="mr-1.5 h-3.5 w-3.5" /> Área (
									{selectedAreaIds.length})
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-64 p-0">
								<Command>
									<CommandInput
										placeholder="Buscar Área..."
										className="h-9 border-0 shadow-none focus-visible:ring-0"
									/>
									<CommandList>
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
														"mr-2 h-3.5 w-3.5",
														selectedAreaIds.includes(opt.value)
															? "opacity-100"
															: "opacity-0",
													)}
												/>{" "}
												<span className="truncate">{opt.label}</span>
											</CommandItem>
										))}
									</CommandList>
								</Command>
							</DropdownMenuContent>
						</DropdownMenu>
						{hasActiveMemberFilters && (
							<Button
								variant="link"
								size="sm"
								onClick={clearMemberFilters}
								className="text-xs h-auto px-1 text-destructive hover:text-destructive/80"
							>
								<X className="mr-1 h-3 w-3" />
								Limpiar
							</Button>
						)}
					</div>
					<div className="flex justify-end">
						<Button onClick={handleApplyFilters}>
							<Search className="mr-2 h-4 w-4" />
							Aplicar Filtros
						</Button>
					</div>
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
									{months.map((month) => (
										<TableHead
											key={month.toISOString()}
											className="text-center min-w-[120px] capitalize"
										>
											<button
												onClick={() => handleMonthClick(month)}
												className="w-full h-full p-2 font-semibold text-primary hover:bg-muted rounded-md"
											>
												{format(month, "MMM yyyy", { locale: es })}
											</button>
										</TableHead>
									))}
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
