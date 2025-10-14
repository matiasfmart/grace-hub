"use client";

import { format, isValid, parseISO } from "date-fns";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

interface DateRangeFilterProps {
	initialStartDate?: string;
	initialEndDate?: string;
}

export default function DateRangeFilter({
	initialStartDate,
	initialEndDate,
}: DateRangeFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [startDate, setStartDate] = useState<Date | undefined>(
		initialStartDate && isValid(parseISO(initialStartDate))
			? parseISO(initialStartDate)
			: undefined,
	);
	const [endDate, setEndDate] = useState<Date | undefined>(
		initialEndDate && isValid(parseISO(initialEndDate))
			? parseISO(initialEndDate)
			: undefined,
	);

	useEffect(() => {
		setStartDate(
			initialStartDate && isValid(parseISO(initialStartDate))
				? parseISO(initialStartDate)
				: undefined,
		);
		setEndDate(
			initialEndDate && isValid(parseISO(initialEndDate))
				? parseISO(initialEndDate)
				: undefined,
		);
	}, [initialStartDate, initialEndDate]);

	const handleApplyFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		if (startDate) {
			params.set("startDate", format(startDate, "yyyy-MM-dd"));
		} else {
			params.delete("startDate");
		}
		if (endDate) {
			params.set("endDate", format(endDate, "yyyy-MM-dd"));
		} else {
			params.delete("endDate");
		}
		// Reset instance page and member page when date filters change
		params.delete("page");
		params.delete("mPage");
		router.push(`${pathname}?${params.toString()}`);
	};

	const handleClearFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("startDate");
		params.delete("endDate");
		// Reset instance page and member page when date filters change
		params.delete("page");
		params.delete("mPage");
		setStartDate(undefined);
		setEndDate(undefined);
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="startDateFilter">Fecha de Inicio</Label>
				<DatePicker
					date={startDate}
					setDate={setStartDate}
					placeholder="Desde"
				/>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="endDateFilter">Fecha de Fin</Label>
				<DatePicker date={endDate} setDate={setEndDate} placeholder="Hasta" />
			</div>
			<div className="flex flex-col sm:flex-row gap-2 pt-2">
				<Button
					onClick={handleApplyFilters}
					disabled={!startDate || !endDate}
					className="w-full sm:w-auto"
				>
					Aplicar Filtro
				</Button>
				<Button
					onClick={handleClearFilters}
					variant="outline"
					disabled={
						!initialStartDate && !initialEndDate && !startDate && !endDate
					}
					className="w-full sm:w-auto"
				>
					<X className="mr-2 h-4 w-4" /> Limpiar
				</Button>
			</div>
		</div>
	);
}
