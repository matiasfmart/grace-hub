"use client";

import {
	Activity,
	Check,
	ShieldCheck,
	Users as UsersIcon,
	X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterOption {
	value: string;
	label: string;
}

interface EventsTableFiltersProps {
	roleFilterOptions: FilterOption[];
	statusFilterOptions: FilterOption[];
	gdiFilterOptions: FilterOption[];
	areaFilterOptions: FilterOption[];
	currentRoleFilters: string[];
	currentStatusFilters: Member["status"][];
	currentGdiFilters: string[];
	currentAreaFilters: string[];
}

export default function EventsTableFilters({
	roleFilterOptions,
	statusFilterOptions,
	gdiFilterOptions,
	areaFilterOptions,
	currentRoleFilters,
	currentStatusFilters,
	currentGdiFilters,
	currentAreaFilters,
}: EventsTableFiltersProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const updateTableFiltersURL = (newFilters: {
		tmr?: string[];
		tms?: string[];
		tmg?: string[];
		tma?: string[];
	}) => {
		const params = new URLSearchParams(searchParams.toString());
		newFilters.tmr && newFilters.tmr.length > 0
			? params.set("tmr", newFilters.tmr.join(","))
			: params.delete("tmr");
		newFilters.tms && newFilters.tms.length > 0
			? params.set("tms", newFilters.tms.join(","))
			: params.delete("tms");
		newFilters.tmg && newFilters.tmg.length > 0
			? params.set("tmg", newFilters.tmg.join(","))
			: params.delete("tmg");
		newFilters.tma && newFilters.tma.length > 0
			? params.set("tma", newFilters.tma.join(","))
			: params.delete("tma");
		params.set("mPage", "1"); // Reset member page
		return `${pathname}?${params.toString()}`;
	};

	const handleRoleFilterChange = (roleValue: string) => {
		const newRoles = currentRoleFilters.includes(roleValue)
			? currentRoleFilters.filter((r) => r !== roleValue)
			: [...currentRoleFilters, roleValue];
		router.push(
			updateTableFiltersURL({
				tmr: newRoles,
				tms: currentStatusFilters,
				tmg: currentGdiFilters,
				tma: currentAreaFilters,
			}),
		);
	};

	const handleStatusFilterChange = (statusValue: string) => {
		const newStatuses = currentStatusFilters.includes(
			statusValue as Member["status"],
		)
			? currentStatusFilters.filter((s) => s !== statusValue)
			: [...currentStatusFilters, statusValue as Member["status"]];
		router.push(
			updateTableFiltersURL({
				tmr: currentRoleFilters,
				tms: newStatuses,
				tmg: currentGdiFilters,
				tma: currentAreaFilters,
			}),
		);
	};

	const handleGdiFilterChange = (gdiValue: string) => {
		const newGdis = currentGdiFilters.includes(gdiValue)
			? currentGdiFilters.filter((g) => g !== gdiValue)
			: [...currentGdiFilters, gdiValue];
		router.push(
			updateTableFiltersURL({
				tmr: currentRoleFilters,
				tms: currentStatusFilters,
				tmg: newGdis,
				tma: currentAreaFilters,
			}),
		);
	};

	const handleAreaFilterChange = (areaValue: string) => {
		const newAreas = currentAreaFilters.includes(areaValue)
			? currentAreaFilters.filter((a) => a !== areaValue)
			: [...currentAreaFilters, areaValue];
		router.push(
			updateTableFiltersURL({
				tmr: currentRoleFilters,
				tms: currentStatusFilters,
				tmg: currentGdiFilters,
				tma: newAreas,
			}),
		);
	};

	const clearAllTableFilters = () => {
		router.push(updateTableFiltersURL({ tmr: [], tms: [], tmg: [], tma: [] }));
	};

	const hasActiveFilters =
		currentRoleFilters.length > 0 ||
		currentStatusFilters.length > 0 ||
		currentGdiFilters.length > 0 ||
		currentAreaFilters.length > 0;

	return (
		<div className="my-4 p-3 border rounded-lg bg-card shadow-sm">
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="justify-start text-xs w-full"
						>
							<ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Rol (
							{currentRoleFilters.length > 0
								? currentRoleFilters.length
								: "Todos"}
							)
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56 p-0">
						<Command>
							<CommandInput
								placeholder="Buscar rol..."
								className="h-9 border-0 shadow-none focus-visible:ring-0"
							/>
							<CommandList>
								<CommandEmpty>No se encontró el rol.</CommandEmpty>
								<DropdownMenuLabel className="px-2 pt-2 text-xs">
									Filtrar por Rol
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="mx-1 my-1" />
								<CommandGroup>
									{roleFilterOptions.map((opt) => (
										<CommandItem
											key={opt.value}
											value={opt.label}
											onSelect={() => handleRoleFilterChange(opt.value)}
											className="text-xs cursor-pointer"
										>
											<div className="flex items-center w-full">
												<Check
													className={cn(
														"mr-2 h-3.5 w-3.5",
														currentRoleFilters.includes(opt.value)
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												<span>{opt.label}</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="justify-start text-xs w-full"
						>
							<Activity className="mr-1.5 h-3.5 w-3.5" /> Estado (
							{currentStatusFilters.length > 0
								? currentStatusFilters.length
								: "Todos"}
							)
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56 p-0">
						<Command>
							<CommandInput
								placeholder="Buscar estado..."
								className="h-9 border-0 shadow-none focus-visible:ring-0"
							/>
							<CommandList>
								<CommandEmpty>No se encontró el estado.</CommandEmpty>
								<DropdownMenuLabel className="px-2 pt-2 text-xs">
									Filtrar por Estado
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="mx-1 my-1" />
								<CommandGroup>
									{statusFilterOptions.map((opt) => (
										<CommandItem
											key={opt.value}
											value={opt.label}
											onSelect={() => handleStatusFilterChange(opt.value)}
											className="text-xs cursor-pointer"
										>
											<div className="flex items-center w-full">
												<Check
													className={cn(
														"mr-2 h-3.5 w-3.5",
														currentStatusFilters.includes(
															opt.value as Member["status"],
														)
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												<span>{opt.label}</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="justify-start text-xs w-full"
						>
							<UsersIcon className="mr-1.5 h-3.5 w-3.5" /> GDI (
							{currentGdiFilters.length > 0
								? currentGdiFilters.length
								: "Todos"}
							)
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-64 p-0">
						<Command>
							<CommandInput
								placeholder="Buscar GDI..."
								className="h-9 border-0 shadow-none focus-visible:ring-0"
							/>
							<CommandList>
								<CommandEmpty>No se encontró el GDI.</CommandEmpty>
								<DropdownMenuLabel className="px-2 pt-2 text-xs">
									Filtrar por GDI
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="mx-1 my-1" />
								<CommandGroup>
									{gdiFilterOptions.map((opt) => (
										<CommandItem
											key={opt.value}
											value={opt.label}
											onSelect={() => handleGdiFilterChange(opt.value)}
											className="text-xs cursor-pointer"
										>
											<div className="flex items-center w-full">
												<Check
													className={cn(
														"mr-2 h-3.5 w-3.5",
														currentGdiFilters.includes(opt.value)
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												<span className="truncate">{opt.label}</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="justify-start text-xs w-full"
						>
							<Activity className="mr-1.5 h-3.5 w-3.5" /> Área (
							{currentAreaFilters.length > 0
								? currentAreaFilters.length
								: "Todas"}
							)
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-64 p-0">
						<Command>
							<CommandInput
								placeholder="Buscar Área..."
								className="h-9 border-0 shadow-none focus-visible:ring-0"
							/>
							<CommandList>
								<CommandEmpty>No se encontró el Área.</CommandEmpty>
								<DropdownMenuLabel className="px-2 pt-2 text-xs">
									Filtrar por Área Ministerial
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="mx-1 my-1" />
								<CommandGroup>
									{areaFilterOptions.map((opt) => (
										<CommandItem
											key={opt.value}
											value={opt.label}
											onSelect={() => handleAreaFilterChange(opt.value)}
											className="text-xs cursor-pointer"
										>
											<div className="flex items-center w-full">
												<Check
													className={cn(
														"mr-2 h-3.5 w-3.5",
														currentAreaFilters.includes(opt.value)
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												<span className="truncate">{opt.label}</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{hasActiveFilters && (
				<Button
					variant="link"
					size="sm"
					className="mt-2 px-0 h-auto text-xs text-destructive hover:text-destructive/80"
					onClick={clearAllTableFilters}
				>
					<X className="mr-1 h-3 w-3" /> Limpiar filtros de miembros
				</Button>
			)}
		</div>
	);
}
