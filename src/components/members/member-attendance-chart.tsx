"use client";

import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	CalendarRange,
	CheckCircle2,
	Clock,
	HelpCircle,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AttendanceMeetingPoint, AttendanceStatus } from "@/lib/utils/attendance";

type StatusFilter = "all" | "attended" | "absent" | "pending_past";

interface MemberAttendanceSummaryProps {
	meetings: AttendanceMeetingPoint[];
	memberName: string;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
	attended: "Presente",
	absent: "Ausente",
	pending_past: "Sin registrar",
	pending_future: "Pendiente",
};

function AttendanceIcon({ status }: { status: AttendanceStatus }) {
	switch (status) {
		case "attended":
			return <CheckCircle2 className="h-4 w-4 text-green-600" />;
		case "absent":
			return <XCircle className="h-4 w-4 text-red-600" />;
		case "pending_past":
			return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
		case "pending_future":
			return <Clock className="h-4 w-4 text-primary/60" />;
	}
}

function formatMeetingDate(dateString: string): string {
	try {
		const d = parseISO(dateString);
		return isValid(d) ? format(d, "dd MMM yyyy", { locale: es }) : dateString;
	} catch {
		return dateString;
	}
}

export default function MemberAttendanceSummary({
	meetings,
	memberName,
}: MemberAttendanceSummaryProps) {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	const filtered = statusFilter === "all"
		? meetings
		: meetings.filter((m) => m.status === statusFilter);

	return (
		<Card className="shadow-none border">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<CalendarRange className="h-4 w-4 text-primary" />
						Detalle de reuniones
					</CardTitle>
					<Select
						value={statusFilter}
						onValueChange={(v) => setStatusFilter(v as StatusFilter)}
					>
						<SelectTrigger className="h-7 w-[160px] text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todas</SelectItem>
							<SelectItem value="attended">Solo presentes</SelectItem>
							<SelectItem value="absent">Solo ausentes</SelectItem>
							<SelectItem value="pending_past">Sin registrar</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				{filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
						<CalendarRange className="h-8 w-8 opacity-40" />
						<p className="text-sm">
							{meetings.length === 0
								? `No hay reuniones registradas para ${memberName} en este período.`
								: "No hay reuniones con el filtro seleccionado."}
						</p>
					</div>
				) : (
					<ScrollArea className="h-[260px]">
						<TooltipProvider delayDuration={200}>
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="text-xs w-[100px]">Fecha</TableHead>
										<TableHead className="text-xs">Serie</TableHead>
										<TableHead className="text-xs text-center w-[100px]">Estado</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.map((m) => (
										<TableRow key={m.meetingId} className="text-xs">
											<TableCell className="text-muted-foreground font-mono">
												{formatMeetingDate(m.meetingDate)}
											</TableCell>
											<TableCell className="max-w-[180px] truncate">
												{m.seriesName}
											</TableCell>
											<TableCell className="text-center">
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="inline-flex items-center justify-center gap-1">
															<AttendanceIcon status={m.status} />
														</span>
													</TooltipTrigger>
													<TooltipContent side="left">
														{STATUS_LABELS[m.status]}
													</TooltipContent>
												</Tooltip>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TooltipProvider>
					</ScrollArea>
				)}
			</CardContent>
		</Card>
	);
}
