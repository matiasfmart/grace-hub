"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronDown, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import DateRangeFilter from "@/components/events/date-range-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { MeetingSeries } from "@/lib/types";

interface EventsToolbarProps {
	allSeries: MeetingSeries[];
	selectedSeriesId?: string;
	appliedStartDate?: string;
	appliedEndDate?: string;
}

export default function EventsToolbar({
	allSeries,
	selectedSeriesId,
	appliedStartDate,
	appliedEndDate,
}: EventsToolbarProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [datePopoverOpen, setDatePopoverOpen] = useState(false);

	const hasDateFilters = Boolean(appliedStartDate || appliedEndDate);

	const handleSeriesChange = (seriesId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("series", seriesId);
		// Keep date filters when changing series
		router.push(`/events?${params.toString()}`);
	};

	const handleClearDateFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("startDate");
		params.delete("endDate");
		router.push(`/events?${params.toString()}`);
	};

	const getDateFilterLabel = () => {
		if (appliedStartDate && appliedEndDate) {
			return `${format(parseISO(appliedStartDate), "dd/MM/yy", { locale: es })} - ${format(parseISO(appliedEndDate), "dd/MM/yy", { locale: es })}`;
		}
		if (appliedStartDate) {
			return `Desde ${format(parseISO(appliedStartDate), "dd/MM/yy", { locale: es })}`;
		}
		if (appliedEndDate) {
			return `Hasta ${format(parseISO(appliedEndDate), "dd/MM/yy", { locale: es })}`;
		}
		return "Filtrar Fechas";
	};

	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
			{/* Series Selector */}
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<Select
					value={selectedSeriesId || ""}
					onValueChange={handleSeriesChange}
				>
					<SelectTrigger className="w-full sm:w-[280px]">
						<SelectValue placeholder="Seleccionar serie..." />
					</SelectTrigger>
					<SelectContent>
						{allSeries.map((series) => (
							<SelectItem key={series.id} value={series.id}>
								<div className="flex items-center justify-between gap-2 w-full">
									<span className="truncate">{series.name}</span>
									<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-2">
										{series.frequency === "OneTime" ? "Única" : series.frequency === "Weekly" ? "Sem." : "Mens."}
									</Badge>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Date Filter Popover */}
			<div className="flex items-center gap-2">
				<Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
					<PopoverTrigger asChild>
						<Button
							variant={hasDateFilters ? "secondary" : "outline"}
							size="sm"
							className="h-9"
						>
							<Calendar className="h-4 w-4 mr-2" />
							{getDateFilterLabel()}
							<ChevronDown className="h-3 w-3 ml-2 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-4" align="end">
						<div className="space-y-4">
							<h4 className="font-medium text-sm">Filtrar por Fecha</h4>
							<DateRangeFilter
								initialStartDate={appliedStartDate}
								initialEndDate={appliedEndDate}
							/>
						</div>
					</PopoverContent>
				</Popover>

				{hasDateFilters && (
					<Button
						variant="ghost"
						size="sm"
						className="h-9 px-2"
						onClick={handleClearDateFilters}
					>
						<X className="h-4 w-4" />
						<span className="sr-only">Limpiar filtros</span>
					</Button>
				)}
			</div>
		</div>
	);
}
