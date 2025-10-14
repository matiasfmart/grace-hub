"use client";

import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
	date: Date | undefined;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
}

export function DatePicker({
	date,
	setDate,
	placeholder = "Pick a date",
	disabled,
}: DatePickerProps) {
	const isDateValidAnInstance = date instanceof Date && isValid(date);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={"outline"}
					disabled={disabled}
					className={cn(
						"w-full justify-start text-left font-normal",
						!isDateValidAnInstance && "text-muted-foreground",
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{isDateValidAnInstance ? (
						format(date, "PPP")
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0">
				<Calendar
					mode="single"
					selected={isDateValidAnInstance ? date : undefined}
					onSelect={setDate}
					disabled={disabled}
					// initialFocus prop removed
				/>
			</PopoverContent>
		</Popover>
	);
}
